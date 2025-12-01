import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET: Check if user has liked and get total likes count
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    console.log(`[Comment Like API] GET request for comment: ${commentId}`)

    const supabase = await createClient()

    // 1. Get user (optional for GET)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 2. Verify comment exists
    const { data: comment } = await supabase
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single()

    if (!comment) {
      console.log(`[Comment Like API] Comment not found: ${commentId}`)
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // 3. If not logged in, return public data only
    if (!user) {
      return NextResponse.json({
        userHasLiked: false,
        totalLikes: comment.likes_count || 0,
      })
    }

    // 4. Check if user has liked this comment
    const { data: like } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    const userHasLiked = !!like

    console.log(`[Comment Like API] User has liked: ${userHasLiked}`)

    return NextResponse.json({
      userHasLiked,
      totalLikes: comment.likes_count || 0,
    })
  } catch (error: any) {
    console.error('[Comment Like API] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch like status' },
      { status: 500 }
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST: Add like to comment (requires authentication)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    console.log(`[Comment Like API] POST request for comment: ${commentId}`)

    const supabase = await createClient()

    // 1. Verify user authentication (required!)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[Comment Like API] Unauthorized - Login required')
      return NextResponse.json(
        { error: 'Unauthorized', requiresAuth: true },
        { status: 401 }
      )
    }

    console.log(`[Comment Like API] User ID: ${user.id}`)

    // 2. Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      console.log(`[Comment Like API] Comment not found: ${commentId}`, commentError)
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // 3. Add like
    console.log('[Comment Like API] Inserting like for comment:', commentId, 'user:', user.id)
    const { error: insertError } = await supabase.from('comment_likes').insert({
      comment_id: commentId,
      user_id: user.id,
    })

    if (insertError) {
      console.log('[Comment Like API] Insert error:', insertError)

      // UNIQUE constraint violation = already liked
      if (insertError.code === '23505') {
        console.log('[Comment Like API] User already liked (UNIQUE constraint)')
        return NextResponse.json(
          { error: 'Already liked', alreadyLiked: true },
          { status: 400 }
        )
      }

      throw insertError
    }

    console.log('[Comment Like API] ✅ Insert success!')

    // 4. Count actual likes from comment_likes table
    console.log('[Comment Like API] Counting actual likes from comment_likes...')

    const { count, error: countError } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    if (countError) {
      console.error('[Comment Like API] ❌ Count error:', countError)
      throw countError
    }

    const actualLikesCount = count || 0
    console.log('[Comment Like API] 📊 Actual likes from comment_likes:', actualLikesCount)

    // 5. Update comments.likes_count
    console.log('[Comment Like API] 🔄 Updating comments.likes_count...')

    const { error: updateError } = await supabase
      .from('comments')
      .update({ likes_count: actualLikesCount })
      .eq('id', commentId)

    if (updateError) {
      console.error('[Comment Like API] ❌ Update error:', updateError)
      console.error('[Comment Like API] ❌ Update error details:', JSON.stringify(updateError))
      // Continue even if update fails (count is accurate)
    } else {
      console.log('[Comment Like API] ✅ Comments table updated to:', actualLikesCount)
    }

    // 6. Verify the update actually worked
    console.log('[Comment Like API] 🔍 Verifying update...')
    const { data: verifyComment, error: verifyError } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single()

    if (verifyError) {
      console.error('[Comment Like API] ❌ Verification error:', verifyError)
    } else {
      console.log('[Comment Like API] 📊 Verified DB likes_count:', verifyComment?.likes_count)
      if (verifyComment?.likes_count !== actualLikesCount) {
        console.error('[Comment Like API] ⚠️ WARNING: DB count mismatch!')
        console.error('[Comment Like API] Expected:', actualLikesCount)
        console.error('[Comment Like API] Actual:', verifyComment?.likes_count)
      }
    }

    const finalLikesCount = actualLikesCount
    console.log('[Comment Like API] 🎯 Final likes count:', finalLikesCount)

    // 7. Return response
    console.log('[Comment Like API] 📤 Returning response with totalLikes:', finalLikesCount)

    return NextResponse.json({
      success: true,
      totalLikes: finalLikesCount,
      userHasLiked: true,
    })
  } catch (error: any) {
    console.error('[Comment Like API] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add like' },
      { status: 500 }
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE: Remove like from comment (requires authentication)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    console.log(`[Comment Like API DELETE] Request for comment: ${commentId}`)

    const supabase = await createClient()

    // 1. Verify user authentication (required!)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[Comment Like API DELETE] Unauthorized - Login required')
      return NextResponse.json(
        { error: 'Unauthorized', requiresAuth: true },
        { status: 401 }
      )
    }

    console.log(`[Comment Like API DELETE] User ID: ${user.id}`)

    // 2. Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, likes_count')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      console.log(`[Comment Like API DELETE] Comment not found: ${commentId}`, commentError)
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // 3. Find the user's like
    console.log('[Comment Like API DELETE] 🔍 Finding user like...')

    const { data: like, error: findError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (findError) {
      console.error('[Comment Like API DELETE] ❌ Find error:', findError)
      return NextResponse.json(
        { error: 'Failed to find like' },
        { status: 500 }
      )
    }

    if (!like) {
      console.log('[Comment Like API DELETE] ⚠️ No like found to delete')

      // No like to remove - return current count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      return NextResponse.json({
        success: true,
        totalLikes: count || 0,
        userHasLiked: false,
        message: 'No like to remove',
      })
    }

    console.log('[Comment Like API DELETE] ✅ Found like:', like.id)

    // 4. Delete the like
    console.log('[Comment Like API DELETE] 🗑️ Deleting like ID:', like.id)

    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', like.id)

    if (deleteError) {
      console.error('[Comment Like API DELETE] ❌ Delete error:', deleteError)
      throw deleteError
    }

    console.log('[Comment Like API DELETE] ✅ Like deleted successfully!')

    // 5. Count remaining likes
    console.log('[Comment Like API DELETE] 📊 Counting remaining likes...')

    const { count, error: countError } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    if (countError) {
      console.error('[Comment Like API DELETE] ❌ Count error:', countError)
      throw countError
    }

    const actualLikesCount = count || 0
    console.log('[Comment Like API DELETE] 📊 Remaining likes:', actualLikesCount)

    // 6. Update comments.likes_count
    console.log('[Comment Like API DELETE] 🔄 Updating comments.likes_count to:', actualLikesCount)

    const { error: updateError } = await supabase
      .from('comments')
      .update({ likes_count: actualLikesCount })
      .eq('id', commentId)

    if (updateError) {
      console.error('[Comment Like API DELETE] ❌ Update error:', updateError)
      console.error('[Comment Like API DELETE] ❌ Update error details:', JSON.stringify(updateError))
      // Continue even if update fails
    } else {
      console.log('[Comment Like API DELETE] ✅ Comments table updated successfully')
    }

    // 7. Verify the update actually worked
    console.log('[Comment Like API DELETE] 🔍 Verifying update...')
    const { data: verifyComment, error: verifyError } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single()

    if (verifyError) {
      console.error('[Comment Like API DELETE] ❌ Verification error:', verifyError)
    } else {
      console.log('[Comment Like API DELETE] 📊 Verified DB likes_count:', verifyComment?.likes_count)
      if (verifyComment?.likes_count !== actualLikesCount) {
        console.error('[Comment Like API DELETE] ⚠️ WARNING: DB count mismatch!')
        console.error('[Comment Like API DELETE] Expected:', actualLikesCount)
        console.error('[Comment Like API DELETE] Actual:', verifyComment?.likes_count)
      }
    }

    const finalLikesCount = actualLikesCount
    console.log('[Comment Like API DELETE] 🎯 Final likes count:', finalLikesCount)

    // 8. Return response
    console.log('[Comment Like API DELETE] ✅ DELETE completed successfully')
    console.log('[Comment Like API DELETE] 📤 Returning response with totalLikes:', finalLikesCount)

    return NextResponse.json({
      success: true,
      totalLikes: finalLikesCount,
      userHasLiked: false,
      removed: 1,
    })
  } catch (error: any) {
    console.error('[Comment Like API DELETE] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove like' },
      { status: 500 }
    )
  }
}
