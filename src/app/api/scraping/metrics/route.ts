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

    // Get sample listings for field analysis (using correct column names)
    const { data: sampleListings, error: listingsError } = await supabase
      .from('flippa_listings')
      .select('title, url, asking_price, monthly_revenue, monthly_profit, category, description, age_months, page_views_monthly')
      .limit(1000)

    if (listingsError) {
      console.error('Listings error:', listingsError)
      throw listingsError
    }

    console.log(`📋 Retrieved ${sampleListings?.length || 0} listings for analysis`)

    const listings = sampleListings || []
    const totalSample = listings.length

    // Calculate real field completion rates with correct column names
    const withTitle = listings.filter(l => l.title && l.title.length > 5).length
    const withPrice = listings.filter(l => l.asking_price && l.asking_price > 0).length
    const withRevenue = listings.filter(l => l.monthly_revenue && l.monthly_revenue > 0).length
    const withProfit = listings.filter(l => l.monthly_profit !== null && l.monthly_profit !== undefined).length
    const withCategory = listings.filter(l => l.category && l.category !== 'Other').length
    const withDescription = listings.filter(l => l.description && l.description.length > 20).length
    const withAge = listings.filter(l => l.age_months && l.age_months > 0).length
    const withTraffic = listings.filter(l => l.page_views_monthly && l.page_views_monthly > 0).length

    const fieldCompletion = {
      title: totalSample > 0 ? (withTitle / totalSample) * 100 : 0,
      price: totalSample > 0 ? (withPrice / totalSample) * 100 : 0,
      revenue: totalSample > 0 ? (withRevenue / totalSample) * 100 : 0,
      profit: totalSample > 0 ? (withProfit / totalSample) * 100 : 0,
      category: totalSample > 0 ? (withCategory / totalSample) * 100 : 0,
      description: totalSample > 0 ? (withDescription / totalSample) * 100 : 0,
      age: totalSample > 0 ? (withAge / totalSample) * 100 : 0,
      traffic: totalSample > 0 ? (withTraffic / totalSample) * 100 : 0
    }

    const successRate = Object.values(fieldCompletion).reduce((a, b) => a + b, 0) / Object.keys(fieldCompletion).length

    // Get recent activity
    const { data: recentData } = await supabase
      .from('flippa_listings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentListings = recentData?.filter(r => new Date(r.created_at) > dayAgo).length || 0

    const metrics = {
      successRate: Number(successRate.toFixed(1)),
      totalListings: totalCount || 0,
      fieldCompletion: Object.entries(fieldCompletion).reduce((acc, [key, value]) => {
        acc[key] = Number(value.toFixed(1))
        return acc
      }, {} as any),
      processingTime: 0, // No longer relevant for migrated data
      lastRun: recentData?.[0]?.created_at || new Date().toISOString(),
      meetsApifyStandard: successRate >= 95,
      recentActivity: {
        last24h: recentListings,
        averagePerHour: Math.round(recentListings / 24)
      },
      
      // Summary stats
      summary: {
        dataQuality: successRate >= 90 ? 'Excellent' : successRate >= 70 ? 'Good' : 'Fair',
        completeness: `${Math.round(successRate)}%`,
        totalRecords: totalCount || 0,
        lastUpdate: recentData?.[0]?.created_at || null
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