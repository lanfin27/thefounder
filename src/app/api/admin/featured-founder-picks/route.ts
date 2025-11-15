import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Helper function to check if user is admin
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()

    // Get auth token from cookies
    const authCookie = allCookies.find(cookie =>
      cookie.name.includes('auth-token') || cookie.name.includes('sb-')
    )

    if (!authCookie) {
      return false
    }

    // Create supabase client with user session
    const { data: { user } } = await supabase.auth.getUser(authCookie.value)

    if (!user) {
      return false
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'admin'
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

/**
 * GET /api/admin/featured-founder-picks
 * Fetch all posts and current featured picks for admin management
 */
export async function GET(request: NextRequest) {
  // Check admin permission
  const adminCheck = await isAdmin(request)
  if (!adminCheck) {
    return NextResponse.json(
      { error: 'Admin 권한이 필요합니다.' },
      { status: 403 }
    )
  }

  try {
    // Fetch all published posts
    const { data: allPosts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, slug, category, reading_time, summary, cover, author, published_date, claps_count, comments_count')
      .in('status', ['published', '발행'])
      .order('published_date', { ascending: false })

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    // Fetch current featured picks
    const { data: featuredPicks, error: picksError } = await supabase
      .from('featured_founder_picks')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (picksError) {
      console.error('Error fetching featured picks:', picksError)
      return NextResponse.json(
        { error: 'Failed to fetch featured picks' },
        { status: 500 }
      )
    }

    // Mark posts that are currently featured
    const postsWithFeatured = (allPosts || []).map(post => ({
      ...post,
      is_featured: (featuredPicks || []).some(pick => pick.post_id === post.id),
      display_order: (featuredPicks || []).find(pick => pick.post_id === post.id)?.display_order
    }))

    return NextResponse.json({
      all_posts: postsWithFeatured,
      featured_picks: featuredPicks || [],
      total_posts: postsWithFeatured.length,
      total_featured: (featuredPicks || []).length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/featured-founder-picks
 * Update featured founder picks (3 posts)
 */
export async function POST(request: NextRequest) {
  // Check admin permission
  const adminCheck = await isAdmin(request)
  if (!adminCheck) {
    return NextResponse.json(
      { error: 'Admin 권한이 필요합니다.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { picks } = body

    if (!Array.isArray(picks)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    if (picks.length > 3) {
      return NextResponse.json(
        { error: '최대 3개까지만 선택할 수 있습니다.' },
        { status: 400 }
      )
    }

    // Deactivate all current picks
    const { error: deactivateError } = await supabase
      .from('featured_founder_picks')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateError) {
      console.error('Error deactivating picks:', deactivateError)
      return NextResponse.json(
        { error: 'Failed to update picks' },
        { status: 500 }
      )
    }

    // Upsert new featured picks
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
      console.error('Error upserting picks:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save picks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Featured picks updated successfully',
      count: picks.length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
