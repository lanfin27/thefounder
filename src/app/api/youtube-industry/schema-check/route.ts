/**
 * Schema Check API
 * Check actual database columns
 */

import { NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get one category to see actual schema
    const { data: categories, error } = await ytSupabase
      .from('youtube_categories')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      actualColumns: categories && categories.length > 0 ? Object.keys(categories[0]) : [],
      sampleData: categories?.[0] || null,
      count: categories?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
