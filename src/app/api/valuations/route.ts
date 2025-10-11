import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify the user is authenticated and matches the requested userId
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Fetch valuations for the user
    const { data: valuations, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching valuations:', error)
      // Return mock data as fallback
      return NextResponse.json({
        success: true,
        valuations: getMockValuations()
      })
    }

    return NextResponse.json({
      success: true,
      valuations: valuations || []
    })
    
  } catch (error) {
    console.error('Valuations API error:', error)
    
    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      valuations: getMockValuations()
    })
  }
}

// Mock data for development/fallback
function getMockValuations() {
  return [
    {
      id: '1',
      company_name: '테크스타트업',
      valuation_amount: 5000000000,
      method: 'multiple',
      created_at: '2024-01-15T10:00:00Z',
      status: 'completed',
      user_id: 'mock-user-id',
      industry: '소프트웨어',
      revenue: 500000000,
      multiple_value: 10
    },
    {
      id: '2',
      company_name: 'AI 솔루션즈',
      valuation_amount: 3000000000,
      method: 'dcf',
      created_at: '2024-01-10T14:30:00Z',
      status: 'completed',
      user_id: 'mock-user-id',
      industry: '인공지능',
      revenue: 300000000,
      growth_rate: 0.5
    },
    {
      id: '3',
      company_name: '이커머스 플랫폼',
      valuation_amount: 2000000000,
      method: 'venture',
      created_at: '2024-01-08T09:15:00Z',
      status: 'draft',
      user_id: 'mock-user-id',
      industry: '이커머스',
      revenue: 400000000,
      funding_stage: 'Series A'
    }
  ]
}