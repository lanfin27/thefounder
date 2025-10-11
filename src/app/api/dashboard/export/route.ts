// Export endpoint for downloading filtered data
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const format = searchParams.get('format') || 'json'
    const limit = Math.min(10000, parseInt(searchParams.get('limit') || '1000'))
    
    // Apply same filters as listings endpoint
    const filters = {
      category: searchParams.get('category'),
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      revenueMin: searchParams.get('revenueMin') ? Number(searchParams.get('revenueMin')) : undefined,
      revenueMax: searchParams.get('revenueMax') ? Number(searchParams.get('revenueMax')) : undefined
    }

    // Build query
    let query = supabase
      .from('flippa_listings')
      .select('*')
      .limit(limit)

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters.priceMin !== undefined) {
      query = query.gte('asking_price', filters.priceMin)
    }
    if (filters.priceMax !== undefined) {
      query = query.lte('asking_price', filters.priceMax)
    }
    if (filters.revenueMin !== undefined) {
      query = query.gte('monthly_revenue', filters.revenueMin)
    }
    if (filters.revenueMax !== undefined) {
      query = query.lte('monthly_revenue', filters.revenueMax)
    }

    const { data: listings, error } = await query

    if (error) throw error

    // Format data based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(listings || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="flippa_listings_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // JSON format
      return NextResponse.json({
        success: true,
        data: listings,
        count: listings?.length || 0,
        filters: filters,
        exportDate: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  // Define columns to export
  const columns = [
    'id',
    'title',
    'url',
    'asking_price',
    'monthly_revenue',
    'monthly_profit',
    'category',
    'age_months',
    'page_views_monthly',
    'description',
    'created_at'
  ]
  
  // Create header row
  const header = columns.join(',')
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col]
      // Escape values containing commas or quotes
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  })
  
  return [header, ...rows].join('\n')
}