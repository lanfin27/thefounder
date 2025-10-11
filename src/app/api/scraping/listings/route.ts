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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log(`🔍 Fetching ${limit} sample listings from database...`)

    const { data: listings, error } = await supabase
      .from('flippa_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Listings API error:', error)
      throw error
    }

    console.log(`📋 Retrieved ${listings?.length || 0} sample listings`)

    // Format for dashboard display with correct column names
    const sampleListings = listings?.map(listing => ({
      id: listing.id,
      title: listing.title || `Business #${listing.id}`,
      price: listing.asking_price,
      monthly: listing.monthly_revenue,
      profit: listing.monthly_profit,
      type: listing.category || 'Unknown',
      age: listing.age_months,
      traffic: listing.page_views_monthly,
      multiple: listing.asking_price && listing.monthly_revenue > 0 
        ? `${(listing.asking_price / (listing.monthly_revenue * 12)).toFixed(1)}x` 
        : 'N/A',
      url: listing.url,
      description: listing.description,
      category: listing.category || '',
      createdAt: listing.created_at
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: sampleListings,
      total: sampleListings.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Listings API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listings',
        details: error.message 
      },
      { status: 500 }
    )
  }
}