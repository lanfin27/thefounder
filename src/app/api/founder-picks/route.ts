import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/founder-picks
 * Fetch active founder picks for main page display
 */
export async function GET() {
  try {
    // Use the helper view for easy querying
    const { data: picks, error } = await supabase
      .from('founder_picks_with_posts')
      .select('*')
      .order('display_order', { ascending: true })
      .limit(3)

    if (error) {
      console.error('Error fetching founder picks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch founder picks' },
        { status: 500 }
      )
    }

    // Format for frontend
    const formattedPicks = (picks || []).map(pick => ({
      id: pick.post_id,
      title: pick.title,
      slug: pick.slug,
      category: pick.category,
      readingTime: pick.reading_time,
      summary: pick.summary,
      cover: pick.cover,
      author: pick.author,
      publishedDate: pick.published_date,
      displayOrder: pick.display_order
    }))

    return NextResponse.json({
      picks: formattedPicks,
      total: formattedPicks.length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
