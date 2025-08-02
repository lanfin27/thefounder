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
      .order('extraction_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Listings API error:', error)
      throw error
    }

    console.log(`📋 Retrieved ${listings?.length || 0} sample listings`)

    // Format for dashboard display
    const sampleListings = listings?.map(listing => ({
      id: listing.listing_id,
      title: listing.title || `Business #${listing.listing_id}`,
      price: listing.price,
      monthly: listing.monthly_revenue,
      type: listing.property_type || 'Unknown',
      multiple: listing.multiple_text || (listing.multiple ? `${listing.multiple}x` : 'N/A'),
      badges: listing.badges || [],
      url: listing.url,
      qualityScore: listing.quality_score,
      category: listing.category || ''
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