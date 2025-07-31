// API route for saving valuation results
import { createClient } from '@/lib/supabase/server'
import { ValuationDataService } from '@/lib/valuation/data-service'
import { ValuationEngine } from '@/lib/valuation/engine'
import { NextRequest, NextResponse } from 'next/server'
import { ValuationInput, ValuationResult, ValuationMethod } from '@/types'

export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const body = await request.json()
    const { 
      companyName, 
      industry, 
      inputData, 
      results,
      notes,
      isDraft = false
    } = body
    
    // Validate required fields
    if (!companyName || !industry || !inputData || !results) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          message: '필수 정보가 누락되었습니다' 
        },
        { status: 400 }
      )
    }
    
    // Prepare valuation data
    const valuationData = {
      user_id: user.id,
      company_name: companyName,
      industry: industry,
      country: 'KR' as const,
      currency: 'USD' as const,
      valuation_method: (results.method || 'multiple') as ValuationMethod,
      input_data: inputData as ValuationInput,
      results: results as ValuationResult,
      notes: notes || null,
      is_draft: isDraft
    }
    
    // Save valuation
    const savedValuation = await ValuationDataService.saveValuation(valuationData)
    
    if (!savedValuation) {
      return NextResponse.json(
        { 
          error: 'Failed to save valuation', 
          message: '가치평가 저장에 실패했습니다' 
        },
        { status: 500 }
      )
    }
    
    // If saving from a template, increment its use count
    if (body.templateId) {
      await ValuationDataService.incrementTemplateUseCount(body.templateId)
    }
    
    // Update or create company profile
    if (!isDraft) {
      await ValuationDataService.upsertCompanyProfile({
        user_id: user.id,
        company_name: companyName,
        industry: industry,
        country: 'KR',
        currency: 'USD',
        company_data: {
          key_metrics: {
            monthlyRevenue: inputData.revenue,
            monthlyProfit: inputData.profit,
            growthRate: inputData.growth_rate,
            latestValuation: results.valuation
          }
        }
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      valuation: savedValuation,
      message: isDraft ? '임시저장이 완료되었습니다' : '가치평가가 저장되었습니다'
    })
    
  } catch (error) {
    console.error('Save valuation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '저장 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}

// Update existing valuation
export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing valuation ID', message: '가치평가 ID가 필요합니다' },
        { status: 400 }
      )
    }
    
    const updatedValuation = await ValuationDataService.updateValuation(
      id,
      user.id,
      updates
    )
    
    if (!updatedValuation) {
      return NextResponse.json(
        { 
          error: 'Failed to update valuation', 
          message: '가치평가 업데이트에 실패했습니다' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      valuation: updatedValuation,
      message: '가치평가가 업데이트되었습니다'
    })
    
  } catch (error) {
    console.error('Update valuation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '업데이트 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}

// Delete valuation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing valuation ID', message: '가치평가 ID가 필요합니다' },
        { status: 400 }
      )
    }
    
    const success = await ValuationDataService.deleteValuation(id, user.id)
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Failed to delete valuation', 
          message: '가치평가 삭제에 실패했습니다' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: '가치평가가 삭제되었습니다'
    })
    
  } catch (error) {
    console.error('Delete valuation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: '삭제 중 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}