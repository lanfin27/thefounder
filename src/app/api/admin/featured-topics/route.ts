import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin Featured Topics API
 *
 * GET  /api/admin/featured-topics - Get all topics with featured status
 * POST /api/admin/featured-topics - Update featured topics
 *
 * Admin only - requires admin role
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET: Fetch all topics with featured status
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

    console.log('[Admin Featured Topics API] 📊 Fetching all topics...')

    // 1. Get all topics with post counts
    const { data: allTopics, error: topicsError } = await supabase
      .from('topic_counts')
      .select('*')
      .order('post_count', { ascending: false })

    if (topicsError) {
      console.error('[Admin Featured Topics API] ❌ Topics error:', topicsError)
      throw topicsError
    }

    // 2. Get current featured topics
    const { data: featured, error: featuredError } = await supabase
      .from('featured_topics')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (featuredError) {
      console.error('[Admin Featured Topics API] ❌ Featured error:', featuredError)
      throw featuredError
    }

    // 3. Merge: Add featured status to all topics
    const topicsWithFeatured = (allTopics || []).map(topic => ({
      topic_name: topic.topic_name,
      post_count: topic.post_count,
      is_featured: featured?.some(f => f.topic_name === topic.topic_name) || false,
      display_order: featured?.find(f => f.topic_name === topic.topic_name)?.display_order
    }))

    console.log(`[Admin Featured Topics API] ✅ Total: ${topicsWithFeatured.length}, Featured: ${featured?.length || 0}`)

    return NextResponse.json({
      all_topics: topicsWithFeatured,
      featured_topics: featured || [],
      total_topics: topicsWithFeatured.length,
      total_featured: featured?.length || 0
    })

  } catch (error) {
    console.error('[Admin Featured Topics API] ❌ GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST: Update featured topics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(request: NextRequest) {
  try {
    const { topics } = await request.json()

    // Validation
    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'Invalid input: topics must be an array' },
        { status: 400 }
      )
    }

    if (topics.length > 8) {
      return NextResponse.json(
        { error: 'Invalid input: Maximum 8 topics allowed' },
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

    console.log(`[Admin Featured Topics API] 💾 Updating ${topics.length} featured topics...`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: Deactivate all current featured topics
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { error: deactivateError } = await supabase
      .from('featured_topics')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)

    if (deactivateError) {
      console.error('[Admin Featured Topics API] ❌ Deactivate error:', deactivateError)
      throw deactivateError
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: Upsert new featured topics
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const upsertData = topics.map((topic: { name: string; order?: number }, index: number) => ({
      topic_name: topic.name,
      display_order: topic.order || index + 1,
      is_active: true,
      updated_at: new Date().toISOString()
    }))

    const { error: upsertError } = await supabase
      .from('featured_topics')
      .upsert(upsertData, {
        onConflict: 'topic_name',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('[Admin Featured Topics API] ❌ Upsert error:', upsertError)
      return NextResponse.json(
        {
          error: 'Failed to update featured topics',
          details: upsertError.message
        },
        { status: 500 }
      )
    }

    console.log(`[Admin Featured Topics API] ✅ Successfully updated ${topics.length} featured topics`)

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${topics.length} featured topics`,
      topics: upsertData
    })

  } catch (error) {
    console.error('[Admin Featured Topics API] ❌ POST error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
