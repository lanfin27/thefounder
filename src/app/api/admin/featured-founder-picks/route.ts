import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin Featured Founder Picks API
 *
 * GET  /api/admin/featured-founder-picks - Get all posts with featured status
 * POST /api/admin/featured-founder-picks - Update featured founder picks
 *
 * Admin only - requires admin role
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET: Fetch all posts with featured status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    console.log('[Admin Featured Founder Picks API] 📊 Fetching all posts...')

    // 1. Get all published posts
    const { data: allPosts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, slug, category, reading_time, summary, cover, author, published_date, claps_count, comments_count')
      .in('status', ['published', '발행'])
      .order('published_date', { ascending: false })

    if (postsError) {
      console.error('[Admin Featured Founder Picks API] ❌ Posts error:', postsError)
      throw postsError
    }

    // 2. Get current featured picks
    const { data: featuredPicks, error: picksError } = await supabase
      .from('featured_founder_picks')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (picksError) {
      console.error('[Admin Featured Founder Picks API] ❌ Featured picks error:', picksError)
      throw picksError
    }

    // 3. Merge: Add featured status to all posts
    const postsWithFeatured = (allPosts || []).map(post => ({
      ...post,
      is_featured: (featuredPicks || []).some(pick => pick.post_id === post.id),
      display_order: (featuredPicks || []).find(pick => pick.post_id === post.id)?.display_order
    }))

    console.log(`[Admin Featured Founder Picks API] ✅ Total: ${postsWithFeatured.length}, Featured: ${featuredPicks?.length || 0}`)

    return NextResponse.json({
      all_posts: postsWithFeatured,
      featured_picks: featuredPicks || [],
      total_posts: postsWithFeatured.length,
      total_featured: featuredPicks?.length || 0
    })

  } catch (error) {
    console.error('[Admin Featured Founder Picks API] ❌ GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch founder picks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST: Update featured founder picks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(request: NextRequest) {
  try {
    const { picks } = await request.json()

    // Validation
    if (!Array.isArray(picks)) {
      return NextResponse.json(
        { error: 'Invalid input: picks must be an array' },
        { status: 400 }
      )
    }

    if (picks.length > 3) {
      return NextResponse.json(
        { error: 'Invalid input: Maximum 3 picks allowed' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check admin authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    console.log(`[Admin Featured Founder Picks API] 💾 Updating ${picks.length} featured picks...`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: Deactivate all current featured picks
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { error: deactivateError } = await supabase
      .from('featured_founder_picks')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)

    if (deactivateError) {
      console.error('[Admin Featured Founder Picks API] ❌ Deactivate error:', deactivateError)
      throw deactivateError
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: Upsert new featured picks
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const upsertData = picks.map((pick: { post_id: string; order?: number }, index: number) => ({
      post_id: pick.post_id,
      display_order: pick.order || index + 1,
      is_active: true,
      updated_at: new Date().toISOString()
    }))

    const { error: upsertError } = await supabase
      .from('featured_founder_picks')
      .upsert(upsertData, {
        onConflict: 'post_id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('[Admin Featured Founder Picks API] ❌ Upsert error:', upsertError)
      return NextResponse.json(
        {
          error: 'Failed to update featured picks',
          details: upsertError.message
        },
        { status: 500 }
      )
    }

    console.log(`[Admin Featured Founder Picks API] ✅ Successfully updated ${picks.length} featured picks`)

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${picks.length} featured picks`,
      picks: upsertData
    })

  } catch (error) {
    console.error('[Admin Featured Founder Picks API] ❌ POST error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
