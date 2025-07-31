// API route for fetching available industries and their data
import { ValuationDataService } from '@/lib/valuation/data-service'
import { getIndustryInsights, INDUSTRY_OPTIONS } from '@/lib/valuation/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeInsights = searchParams.get('insights') === 'true'
    const industry = searchParams.get('industry')
    const country = searchParams.get('country') || 'KR'
    
    // If specific industry requested
    if (industry) {
      const industryData = await ValuationDataService.getIndustryMultiples(industry, country)
      
      if (!industryData) {
        return NextResponse.json(
          { 
            error: 'Industry not found', 
            message: '해당 산업 데이터를 찾을 수 없습니다' 
          },
          { status: 404 }
        )
      }
      
      const response: any = {
        success: true,
        industry: {
          name: industry,
          country: country,
          multiples: {
            profit: {
              average: industryData.avg_profit_multiple,
              median: industryData.median_profit_multiple,
              min: industryData.min_profit_multiple,
              max: industryData.max_profit_multiple
            },
            revenue: {
              average: industryData.avg_revenue_multiple,
              median: industryData.median_revenue_multiple,
              min: industryData.min_revenue_multiple,
              max: industryData.max_revenue_multiple
            }
          },
          sampleSize: industryData.sample_size,
          lastUpdated: industryData.date_calculated,
          dataSource: industryData.data_source
        }
      }
      
      if (includeInsights) {
        response.industry.insights = getIndustryInsights(industry)
      }
      
      // Get recent listings for this industry
      const recentListings = await ValuationDataService.getRecentListings(industry, 5)
      if (recentListings.length > 0) {
        response.industry.recentListings = recentListings.map(listing => ({
          title: listing.title,
          askingPrice: listing.asking_price,
          monthlyRevenue: listing.monthly_revenue,
          monthlyProfit: listing.monthly_profit,
          profitMultiple: listing.profit_multiple,
          revenueMultiple: listing.revenue_multiple,
          listingDate: listing.listing_date
        }))
      }
      
      return NextResponse.json(response)
    }
    
    // Get all available industries
    const dbIndustries = await ValuationDataService.getAllIndustries(country)
    
    // Combine with predefined industry options
    const allIndustries = [...new Set([...INDUSTRY_OPTIONS, ...dbIndustries])].sort()
    
    // Get basic data for each industry if requested
    let industriesWithData = allIndustries
    
    if (searchParams.get('withData') === 'true') {
      industriesWithData = await Promise.all(
        allIndustries.map(async (industryName) => {
          const data = await ValuationDataService.getIndustryMultiples(industryName, country)
          return {
            name: industryName,
            hasData: !!data,
            avgProfitMultiple: data?.avg_profit_multiple,
            avgRevenueMultiple: data?.avg_revenue_multiple,
            sampleSize: data?.sample_size
          }
        })
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      industries: industriesWithData,
      total: industriesWithData.length
    })
    
  } catch (error) {
    console.error('Fetch industries error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '산업 목록 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}

// Get comparable companies for an industry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { industry, monthlyRevenue, limit = 10 } = body
    
    if (!industry) {
      return NextResponse.json(
        { 
          error: 'Missing industry', 
          message: '산업 분야를 지정해주세요' 
        },
        { status: 400 }
      )
    }
    
    const comparables = await ValuationDataService.getComparableListings(
      industry,
      monthlyRevenue,
      limit
    )
    
    return NextResponse.json({ 
      success: true,
      comparables: comparables.map(listing => ({
        id: listing.id,
        title: listing.title,
        url: listing.url,
        askingPrice: listing.asking_price,
        monthlyRevenue: listing.monthly_revenue,
        monthlyProfit: listing.monthly_profit,
        profitMultiple: listing.profit_multiple,
        revenueMultiple: listing.revenue_multiple,
        businessType: listing.business_type,
        listingStatus: listing.listing_status,
        listingDate: listing.listing_date
      })),
      total: comparables.length
    })
    
  } catch (error) {
    console.error('Fetch comparables error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '비교 기업 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}