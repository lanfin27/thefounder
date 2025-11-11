import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Clapper {
  userId: string
  email: string
  name: string
  clappedAt: string
}

// POST: 박수 추가 (로그인 필수, 일반 유저 1회, Admin 무제한)
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    console.log(`[Clap API] POST request for slug: ${slug}`)

    const supabase = await createClient()

    // 1. 사용자 인증 확인 (로그인 필수!)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[Clap API] Unauthorized - Login required')
      return NextResponse.json(
        { error: 'Unauthorized', requiresAuth: true },
        { status: 401 }
      )
    }

    console.log(`[Clap API] User ID: ${user.id}`)

    // 2. Slug로 post 찾기
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, slug, claps_count')
      .eq('slug', slug)
      .single()

    if (postError || !post) {
      console.log(`[Clap API] Post not found: ${slug}`, postError)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postId = post.id || post.slug
    console.log(`[Clap API] Post ID: ${postId}`)

    // 3. 사용자의 role 확인 (Admin 여부)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    console.log(`[Clap API] User is admin: ${isAdmin}`)

    // 4. 박수 추가 (Admin/일반 유저 동일)
    console.log('[Clap API] Inserting clap for post:', postId, 'user:', user.id)
    const { error: insertError } = await supabase.from('post_claps').insert({
      post_id: postId,
      user_id: user.id,
    })

    if (insertError) {
      console.log('[Clap API] Insert error:', insertError)

      // UNIQUE 제약 위반 = 이미 박수함
      if (insertError.code === '23505') {
        console.log('[Clap API] User already clapped (UNIQUE constraint)')
        return NextResponse.json(
          { error: 'Already clapped', alreadyClapped: true },
          { status: 400 }
        )
      }

      throw insertError
    }

    console.log('[Clap API] ✅ Insert success!')

    // 5. 🔥 핵심: post_claps에서 직접 COUNT하고 posts 테이블 즉시 업데이트
    console.log('[Clap API] Counting actual claps from post_claps...')

    const { count, error: countError } = await supabase
      .from('post_claps')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    if (countError) {
      console.error('[Clap API] ❌ Count error:', countError)
      throw countError
    }

    const actualClapsCount = count || 0
    console.log('[Clap API] 📊 Actual claps from post_claps:', actualClapsCount)

    // 6. 🔥 항상 posts.claps_count 업데이트 (트리거 무관)
    console.log('[Clap API] 🔄 Updating posts.claps_count...')

    const { error: updateError } = await supabase
      .from('posts')
      .update({ claps_count: actualClapsCount })
      .eq('id', postId)

    if (updateError) {
      console.error('[Clap API] ❌ Update error:', updateError)
      // 에러가 나도 계속 진행 (카운트는 정확함)
    } else {
      console.log('[Clap API] ✅ Posts table updated to:', actualClapsCount)
    }

    const finalClapsCount = actualClapsCount
    console.log('[Clap API] 🎯 Final claps count:', finalClapsCount)

    // 9. Admin 박수자 목록
    let clappersList: Clapper[] | null = null
    if (isAdmin) {
      console.log('[Clap API] 👑 Fetching clappers list for admin...')

      const { data: claps, error: clapsError } = await supabase
        .from('post_claps')
        .select(
          `
          id,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(100) // 최근 100개로 제한

      if (clapsError) {
        console.error('[Clap API] ❌ Failed to fetch clappers:', clapsError)
      } else {
        clappersList =
          claps?.map((clap: any) => ({
            userId: clap.user_id,
            email: clap.profiles?.email || 'Unknown',
            name: clap.profiles?.full_name || 'Unknown',
            clappedAt: clap.created_at,
          })) || []
        console.log('[Clap API] 📋 Found', clappersList?.length || 0, 'clappers')
      }
    }

    // 10. 최종 응답
    console.log('[Clap API] 📤 Returning response with totalClaps:', finalClapsCount)

    return NextResponse.json({
      success: true,
      totalClaps: finalClapsCount, // 실제 카운트 사용
      userHasClapped: true,
      isAdmin,
      clappers: clappersList,
    })
  } catch (error: any) {
    console.error('[Clap API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add clap' },
      { status: 500 }
    )
  }
}

// GET: 현재 사용자의 박수 여부 확인
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const supabase = await createClient()

    // 1. 사용자 인증 확인 (선택사항)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 2. Slug로 post 찾기
    const { data: post } = await supabase
      .from('posts')
      .select('id, slug, claps_count')
      .eq('slug', slug)
      .single()

    if (!post) {
      return NextResponse.json({ userHasClapped: false, totalClaps: 0 })
    }

    const postId = post.id || post.slug

    // 3. 로그인하지 않은 경우 총 박수 수만 반환
    if (!user) {
      return NextResponse.json({
        userHasClapped: false,
        totalClaps: post.claps_count || 0,
        isAdmin: false,
        clappers: null,
      })
    }

    // 4. 사용자가 박수했는지 확인
    const { data: clap } = await supabase
      .from('post_claps')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    const userHasClapped = !!clap

    // 5. Admin 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // 6. Admin인 경우 박수한 사용자 목록
    let clappersList: Clapper[] | null = null
    if (isAdmin) {
      const { data: claps } = await supabase
        .from('post_claps')
        .select(
          `
          id,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name,
            role
          )
        `
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      clappersList =
        claps?.map((clap: any) => ({
          userId: clap.user_id,
          email: clap.profiles?.email || 'Unknown',
          name: clap.profiles?.full_name || clap.profiles?.email || 'Unknown',
          clappedAt: clap.created_at,
        })) || []
    }

    return NextResponse.json({
      userHasClapped,
      totalClaps: post.claps_count || 0,
      isAdmin,
      clappers: clappersList,
    })
  } catch (error) {
    console.error('[Clap API] GET Error:', error)
    return NextResponse.json({ userHasClapped: false, totalClaps: 0 })
  }
}
