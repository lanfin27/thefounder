// API route for valuation calculation
import { createClient } from '@/lib/supabase/server'
import { ValuationEngine } from '@/lib/valuation/engine'
import { ValuationDataService } from '@/lib/valuation/data-service'
import { validateValuationInput } from '@/lib/valuation/validation'
import { withCache, valuationCache, apiRateLimiter } from '@/lib/valuation/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    if (!apiRateLimiter.canMakeRequest()) {
      return NextResponse.json(
        { 
          error: 'Too many requests', 
          code: 'RATE_LIMIT',
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 429 }
      )
    }

    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다' 
        },
        { status: 401 }
      )
    }
    
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON', 
          code: 'PARSE_ERROR',
          message: '잘못된 요청 형식입니다' 
        },
        { status: 400 }
      )
    }
    
    // Validate input
    const validationErrors = validateValuationInput(body)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          message: '입력값을 확인해주세요',
          details: validationErrors 
        },
        { status: 400 }
      )
    }
    
    const {
      companyName,
      industry,
      monthlyRevenue,
      monthlyProfit,
      businessAge,
      growthRate,
      // DCF parameters
      freeCashFlow,
      discountRate,
      terminalGrowthRate,
      projectionYears,
      // Venture parameters
      stage,
      totalAddressableMarket,
      marketShare,
      burnRate,
      runwayMonths
    } = body
    
    // Get industry benchmarks with caching
    const cacheKey = valuationCache.KEYS.INDUSTRY_DATA(industry)
    const industryData = await withCache(
      cacheKey,
      () => ValuationDataService.getIndustryMultiples(industry),
      30 // Cache for 30 minutes
    )
    
    if (!industryData) {
      return NextResponse.json(
        { 
          error: 'Industry data not found', 
          code: 'NOT_FOUND',
          message: '해당 산업의 벤치마크 데이터를 찾을 수 없습니다' 
        },
        { status: 404 }
      )
    }
    
    // Calculate valuation using the engine
    const engineResult = await ValuationEngine.calculateValuation({
      companyName,
      industry,
      monthlyRevenue: Number(monthlyRevenue || 0),
      monthlyProfit: Number(monthlyProfit || 0),
      businessAge: Number(businessAge || 0),
      growthRate: Number(growthRate || 0),
      freeCashFlow: freeCashFlow ? Number(freeCashFlow) : undefined,
      discountRate: discountRate ? Number(discountRate) : undefined,
      terminalGrowthRate: terminalGrowthRate ? Number(terminalGrowthRate) : undefined,
      projectionYears: projectionYears ? Number(projectionYears) : undefined,
      stage,
      totalAddressableMarket: totalAddressableMarket ? Number(totalAddressableMarket) : undefined,
      marketShare: marketShare ? Number(marketShare) : undefined,
      burnRate: burnRate ? Number(burnRate) : undefined,
      runwayMonths: runwayMonths ? Number(runwayMonths) : undefined
    }, industryData)
    
    // Get comparable listings for context
    const comparableListings = await ValuationDataService.getComparableListings(
      industry,
      monthlyRevenue,
      5
    )
    
    // Prepare response
    const response = {
      success: true,
      valuation: {
        estimatedValue: engineResult.estimatedValue,
        currency: 'USD',
        multiple: engineResult.multiple,
        method: engineResult.method,
        confidenceInterval: engineResult.confidenceInterval,
        confidenceLevel: engineResult.percentileRank >= 70 ? 'high' : 
                        engineResult.percentileRank >= 40 ? 'medium' : 'low',
        percentileRank: engineResult.percentileRank,
        details: engineResult.details
      },
      industryBenchmark: {
        avgProfitMultiple: industryData.avg_profit_multiple,
        medianProfitMultiple: industryData.median_profit_multiple,
        avgRevenueMultiple: industryData.avg_revenue_multiple,
        medianRevenueMultiple: industryData.median_revenue_multiple,
        sampleSize: industryData.sample_size,
        lastUpdated: industryData.date_calculated
      },
      comparables: comparableListings.map(listing => ({
        title: listing.title,
        askingPrice: listing.asking_price,
        monthlyRevenue: listing.monthly_revenue,
        monthlyProfit: listing.monthly_profit,
        profitMultiple: listing.profit_multiple,
        revenueMultiple: listing.revenue_multiple
      })),
      metadata: {
        calculatedAt: new Date().toISOString(),
        userId: user.id,
        inputSummary: {
          companyName,
          industry,
          monthlyRevenue: Number(monthlyRevenue || 0),
          monthlyProfit: Number(monthlyProfit || 0),
          businessAge: businessAge || 0,
          growthRate: growthRate || 0
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Valuation calculation error:', error)
    
    // Log error details for monitoring
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }
    console.error('Error details:', errorDetails)
    
    // Different error responses based on error type
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Parse error', 
          code: 'PARSE_ERROR',
          message: '잘못된 요청 형식입니다' 
        },
        { status: 400 }
      )
    }
    
    if (error instanceof TypeError) {
      return NextResponse.json(
        { 
          error: 'Type error', 
          code: 'TYPE_ERROR',
          message: '데이터 형식이 올바르지 않습니다' 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: '가치평가 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
      },
      { status: 500 }
    )
  }
}

// OPTIONS method for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}