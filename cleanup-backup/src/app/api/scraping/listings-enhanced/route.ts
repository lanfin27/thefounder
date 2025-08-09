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
    const filter = searchParams.get('filter') || 'all' // all, complete, profit-only, revenue-only
    
    console.log(`🔍 Fetching ${limit} enhanced listings (filter: ${filter})...`)

    // Build query
    let query = supabase
      .from('flippa_listings')
      .select('*')
      .order('extraction_timestamp', { ascending: false })

    // Apply filters
    switch (filter) {
      case 'complete':
        query = query.eq('has_complete_financials', true)
        break
      case 'profit-only':
        query = query.gt('monthly_profit', 0)
        break
      case 'revenue-only':
        query = query.gt('monthly_revenue', 0).gt('revenue_multiple', 0)
        break
      case 'both-multiples':
        query = query.gt('profit_multiple', 0).gt('revenue_multiple', 0)
        break
    }

    const { data: listings, error } = await query.limit(limit)

    if (error) {
      console.error('Enhanced listings API error:', error)
      throw error
    }

    console.log(`📋 Retrieved ${listings?.length || 0} enhanced listings`)

    // Format for dashboard display with enhanced fields
    const enhancedListings = listings?.map(listing => {
      // Handle legacy data gracefully
      const monthlyProfit = listing.monthly_profit || listing.monthly_revenue || 0
      const monthlyRevenue = listing.revenue_amount || (listing.monthly_revenue !== listing.monthly_profit ? listing.monthly_revenue : 0)
      const profitMultiple = listing.profit_multiple || listing.multiple || null
      const revenueMultiple = listing.revenue_multiple || null
      
      // Create enhanced multiple text
      let multipleText = listing.multiple_text
      if (!multipleText || multipleText === 'N/A') {
        if (profitMultiple && revenueMultiple) {
          multipleText = `${profitMultiple}x profit | ${revenueMultiple}x revenue`
        } else if (profitMultiple) {
          multipleText = `${profitMultiple}x profit`
        } else if (revenueMultiple) {
          multipleText = `${revenueMultiple}x revenue`
        } else {
          multipleText = 'N/A'
        }
      }
      
      return {
        // Core fields
        id: listing.listing_id,
        title: listing.title || `Business #${listing.listing_id}`,
        price: listing.price,
        
        // Enhanced financial fields
        monthlyProfit: monthlyProfit,
        monthlyRevenue: monthlyRevenue,
        profitMultiple: profitMultiple,
        revenueMultiple: revenueMultiple,
        
        // Combined fields for display
        monthly: monthlyProfit, // Primary monthly metric
        multiple: multipleText,
        
        // Additional fields
        type: listing.property_type || 'Unknown',
        badges: listing.badges || [],
        url: listing.url,
        qualityScore: listing.quality_score,
        category: listing.category || '',
        hasCompleteFinancials: listing.has_complete_financials || false,
        
        // Metadata
        extractionTimestamp: listing.extraction_timestamp,
        extractionConfidence: listing.extraction_confidence
      }
    }) || []

    // Calculate summary statistics
    const stats = {
      total: enhancedListings.length,
      withProfit: enhancedListings.filter(l => l.monthlyProfit > 0).length,
      withRevenue: enhancedListings.filter(l => l.monthlyRevenue > 0).length,
      withBothMultiples: enhancedListings.filter(l => l.profitMultiple && l.revenueMultiple).length,
      withCompleteFinancials: enhancedListings.filter(l => l.hasCompleteFinancials).length
    }

    return NextResponse.json({ 
      success: true, 
      data: enhancedListings,
      stats: stats,
      filter: filter,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Enhanced listings API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch enhanced listings',
        details: error.message 
      },
      { status: 500 }
    )
  }
}