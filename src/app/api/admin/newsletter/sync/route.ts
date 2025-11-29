import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Newsletter Member Status Sync API
 *
 * POST /api/admin/newsletter/sync
 *
 * Synchronizes newsletter_subscribers.is_member with actual user registration status
 * Updates all subscribers based on whether they exist in auth.users
 */
export async function POST() {
  try {
    const supabase = await createClient()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Newsletter Sync] 🔄 Starting newsletter member status sync...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: Fetch all newsletter subscribers
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { data: subscribers, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, is_member, user_id')

    if (fetchError) {
      console.error('[Newsletter Sync] ❌ Error fetching subscribers:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscribers', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[Newsletter Sync] ℹ️  No subscribers found')
      return NextResponse.json({
        success: true,
        updated: 0,
        alreadyCorrect: 0,
        total: 0,
        message: 'No subscribers to sync'
      })
    }

    console.log(`[Newsletter Sync] 📊 Found ${subscribers.length} subscribers`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: Check each subscriber's member status
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let updatedCount = 0
    let alreadyCorrectCount = 0
    const updates: Array<{email: string, from: string, to: string}> = []

    for (const subscriber of subscribers) {
      // Check if user exists in user_profiles (registered member)
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email, created_at')
        .eq('email', subscriber.email.toLowerCase())
        .maybeSingle()

      const isMember = !!userProfile
      const currentStatus = subscriber.is_member

      // If status doesn't match reality, update it
      if (currentStatus !== isMember) {
        console.log(`[Newsletter Sync] 🔄 Updating ${subscriber.email}:`, {
          from: currentStatus ? '회원' : '비회원',
          to: isMember ? '회원' : '비회원'
        })

        const updateData: any = {
          is_member: isMember,
          updated_at: new Date().toISOString()
        }

        // Add user_id and member_since if became a member
        if (isMember && userProfile) {
          updateData.user_id = userProfile.id
          updateData.member_since = userProfile.created_at
        }

        // Remove user_id if no longer a member
        if (!isMember) {
          updateData.user_id = null
          updateData.member_since = null
        }

        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update(updateData)
          .eq('id', subscriber.id)

        if (!updateError) {
          updatedCount++
          updates.push({
            email: subscriber.email,
            from: currentStatus ? '회원' : '비회원',
            to: isMember ? '회원' : '비회원'
          })
        } else {
          console.error(`[Newsletter Sync] ⚠️  Failed to update ${subscriber.email}:`, updateError)
        }
      } else {
        alreadyCorrectCount++
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Newsletter Sync] ✅ Sync completed!')
    console.log(`[Newsletter Sync]   Updated: ${updatedCount}`)
    console.log(`[Newsletter Sync]   Already correct: ${alreadyCorrectCount}`)
    console.log(`[Newsletter Sync]   Total: ${subscribers.length}`)

    if (updates.length > 0) {
      console.log('[Newsletter Sync]   Updates made:')
      updates.forEach(u => {
        console.log(`[Newsletter Sync]     - ${u.email}: ${u.from} → ${u.to}`)
      })
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      alreadyCorrect: alreadyCorrectCount,
      total: subscribers.length,
      updates,
      message: `동기화 완료: ${updatedCount}명 업데이트, ${alreadyCorrectCount}명 이미 정확함`
    })

  } catch (error) {
    console.error('[Newsletter Sync] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
