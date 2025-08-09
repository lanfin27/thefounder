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
    console.log('🔍 Fetching enhanced metrics with profit/revenue separation...')
    
    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count error:', countError)
      throw countError
    }

    console.log(`📊 Total listings in database: ${totalCount}`)

    // Get all listings for enhanced field analysis
    const { data: allListings, error: listingsError } = await supabase
      .from('flippa_listings')
      .select('*')
      .order('extraction_timestamp', { ascending: false })

    if (listingsError) {
      console.error('Listings error:', listingsError)
      throw listingsError
    }

    console.log(`📋 Retrieved ${allListings?.length || 0} listings for enhanced analysis`)

    const listings = allListings || []
    const totalListings = listings.length

    // Calculate enhanced field completion rates with new schema
    const withPrice = listings.filter(l => l.price && l.price > 0).length
    const withProfit = listings.filter(l => 
      (l.monthly_profit && l.monthly_profit > 0) || 
      (l.monthly_revenue && l.monthly_revenue > 0) // Fallback for old data
    ).length
    const withRevenue = listings.filter(l => 
      l.monthly_revenue && l.monthly_revenue > 0 && l.revenue_amount > 0
    ).length
    const withProfitMultiple = listings.filter(l => 
      (l.profit_multiple && l.profit_multiple > 0) || 
      (l.multiple && l.multiple > 0) // Fallback for old data
    ).length
    const withRevenueMultiple = listings.filter(l => 
      l.revenue_multiple && l.revenue_multiple > 0
    ).length
    const withTitle = listings.filter(l => l.title && l.title.length > 5).length
    const withBothMultiples = listings.filter(l => 
      ((l.profit_multiple && l.profit_multiple > 0) || (l.multiple && l.multiple > 0)) &&
      (l.revenue_multiple && l.revenue_multiple > 0)
    ).length
    const withCompleteFinancials = listings.filter(l => l.has_complete_financials).length

    // Enhanced field completion object
    const fieldCompletion = {
      price: totalListings > 0 ? (withPrice / totalListings) * 100 : 0,
      profit: totalListings > 0 ? (withProfit / totalListings) * 100 : 0,
      revenue: totalListings > 0 ? (withRevenue / totalListings) * 100 : 0,
      profitMultiple: totalListings > 0 ? (withProfitMultiple / totalListings) * 100 : 0,
      revenueMultiple: totalListings > 0 ? (withRevenueMultiple / totalListings) * 100 : 0,
      title: totalListings > 0 ? (withTitle / totalListings) * 100 : 0,
      // Legacy field for backwards compatibility
      multiple: totalListings > 0 ? (withProfitMultiple / totalListings) * 100 : 0
    }

    // Calculate overall success rate (now includes 6 fields)
    const coreFields = ['price', 'profit', 'title', 'profitMultiple']
    const coreSuccessRate = coreFields.reduce((sum, field) => sum + fieldCompletion[field as keyof typeof fieldCompletion], 0) / coreFields.length
    
    const allFields = ['price', 'profit', 'revenue', 'profitMultiple', 'revenueMultiple', 'title']
    const overallSuccessRate = allFields.reduce((sum, field) => sum + fieldCompletion[field as keyof typeof fieldCompletion], 0) / allFields.length

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

    // Calculate financial data quality metrics
    const financialMetrics = {
      listingsWithProfit: withProfit,
      listingsWithRevenue: withRevenue,
      listingsWithBothMultiples: withBothMultiples,
      listingsWithCompleteFinancials: withCompleteFinancials,
      profitDataQuality: withProfit > 0 ? (withProfitMultiple / withProfit) * 100 : 0,
      revenueDataQuality: totalListings > 0 ? (withRevenue / totalListings) * 100 : 0
    }

    const metrics = {
      // Core metrics
      successRate: Number(coreSuccessRate.toFixed(1)),
      overallSuccessRate: Number(overallSuccessRate.toFixed(1)),
      totalListings: totalCount || totalListings,
      
      // Enhanced field completion
      fieldCompletion: {
        price: Number(fieldCompletion.price.toFixed(1)),
        profit: Number(fieldCompletion.profit.toFixed(1)),
        revenue: Number(fieldCompletion.revenue.toFixed(1)),
        profitMultiple: Number(fieldCompletion.profitMultiple.toFixed(1)),
        revenueMultiple: Number(fieldCompletion.revenueMultiple.toFixed(1)),
        title: Number(fieldCompletion.title.toFixed(1)),
        // Legacy field
        multiple: Number(fieldCompletion.multiple.toFixed(1))
      },
      
      // Financial metrics
      financialMetrics: {
        withProfit: financialMetrics.listingsWithProfit,
        withRevenue: financialMetrics.listingsWithRevenue,
        withBothMultiples: financialMetrics.listingsWithBothMultiples,
        withCompleteFinancials: financialMetrics.listingsWithCompleteFinancials,
        profitDataQuality: Number(financialMetrics.profitDataQuality.toFixed(1)),
        revenueDataQuality: Number(financialMetrics.revenueDataQuality.toFixed(1)),
        percentageWithBothMultiples: totalListings > 0 ? 
          Number((financialMetrics.listingsWithBothMultiples / totalListings * 100).toFixed(1)) : 0
      },
      
      // Session info
      processingTime: latestSession?.processing_time || 0,
      lastRun: latestSession?.completed_at || new Date().toISOString(),
      meetsApifyStandard: coreSuccessRate >= 95,
      sessionInfo: latestSession,
      
      // Debug info
      debug: {
        totalCount,
        retrievedCount: totalListings,
        withPrice,
        withProfit,
        withRevenue,
        withProfitMultiple,
        withRevenueMultiple,
        withTitle,
        withBothMultiples,
        withCompleteFinancials
      }
    }

    console.log('📊 Enhanced metrics calculated:', {
      totalListings: metrics.totalListings,
      coreSuccessRate: metrics.successRate,
      overallSuccessRate: metrics.overallSuccessRate,
      financialMetrics: metrics.financialMetrics
    })

    return NextResponse.json({ 
      success: true, 
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Enhanced metrics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch enhanced metrics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}