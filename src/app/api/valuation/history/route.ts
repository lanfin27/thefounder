// API route for fetching valuation history
import { createClient } from '@/lib/supabase/server'
import { ValuationDataService } from '@/lib/valuation/data-service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const id = searchParams.get('id')
    
    // If specific ID requested, get single valuation
    if (id) {
      const valuation = await ValuationDataService.getValuationById(id, user.id)
      
      if (!valuation) {
        return NextResponse.json(
          { 
            error: 'Valuation not found', 
            message: '가치평가를 찾을 수 없습니다' 
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ 
        success: true, 
        valuation 
      })
    }
    
    // Get user's valuation history
    const { valuations, total } = await ValuationDataService.getUserValuations(
      user.id,
      limit,
      offset
    )
    
    // Get statistics
    const stats = await ValuationDataService.getValuationStats(user.id)
    
    // Format response
    const response = {
      success: true,
      valuations: valuations.map(v => ({
        id: v.id,
        companyName: v.company_name,
        industry: v.industry,
        valuationMethod: v.valuation_method,
        estimatedValue: v.results?.valuation || 0,
        multiple: v.results?.key_metrics?.profit_multiple || 0,
        currency: v.currency,
        isDraft: v.is_draft,
        createdAt: v.created_at,
        updatedAt: v.updated_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: {
        totalValuations: stats.totalValuations,
        averageMultiple: stats.averageMultiple,
        industryBreakdown: stats.industryBreakdown,
        recentActivity: stats.recentActivity
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Fetch history error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '이력 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}

// Get valuation templates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { type = 'user', industry } = body
    
    let templates
    
    if (type === 'public') {
      templates = await ValuationDataService.getPublicTemplates(industry)
    } else {
      templates = await ValuationDataService.getUserTemplates(user.id)
    }
    
    return NextResponse.json({ 
      success: true, 
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        industry: t.industry,
        valuationMethod: t.valuation_method,
        useCount: t.use_count,
        isPublic: t.is_public,
        templateData: t.template_data,
        createdAt: t.created_at
      }))
    })
    
  } catch (error) {
    console.error('Fetch templates error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '템플릿 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}