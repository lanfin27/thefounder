import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/userService';

/**
 * GET /api/admin/newsletter/subscribers
 * 뉴스레터 구독자 목록 조회 (Admin 전용)
 *
 * ✅ 통합 완료: user_profiles.role 기반 권한 체크
 * ✅ 유저 관리 패널에서 역할 변경 시 즉시 반영
 */
export async function GET(request: Request) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Newsletter API] 📥 Request received');

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Admin Authorization Check (UserService)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Newsletter API] 🔐 Checking admin permission...');

    const isAdmin = await UserService.isAdmin();

    if (!isAdmin) {
      const currentUser = await UserService.getCurrentUser();
      console.log('[Newsletter API] ❌ Unauthorized access attempt');
      console.log('[Newsletter API]   User:', currentUser?.email || 'not authenticated');
      console.log('[Newsletter API]   Role:', currentUser?.role || 'none');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return NextResponse.json(
        {
          error: '관리자 권한이 필요합니다.',
          debug: {
            authenticated: !!currentUser,
            currentRole: currentUser?.role || 'none',
            requiredRole: 'admin',
            suggestion: '유저 관리 패널에서 역할을 admin으로 변경하세요.'
          }
        },
        { status: currentUser ? 403 : 401 }
      );
    }

    const currentUser = await UserService.getCurrentUser();
    console.log('[Newsletter API] ✅ Admin verified:', currentUser?.email);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Query Subscribers Data (Service Role)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    console.log('[Newsletter API] 🔍 Search query:', search || '(none)');

    let query = supabaseAdmin
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (search.trim()) {
      query = query.ilike('email', `%${search.trim()}%`);
    }

    const { data: subscribers, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Newsletter API] ❌ Fetch error:', fetchError);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return NextResponse.json(
        { error: '구독자 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[Newsletter API] ✅ Fetched ${subscribers?.length || 0} subscribers`);

    // Calculate statistics
    const stats = {
      total: subscribers?.length || 0,
      members: subscribers?.filter(s => s.is_member).length || 0,
      nonMembers: subscribers?.filter(s => !s.is_member).length || 0
    };

    console.log('[Newsletter API] 📊 Stats:', stats);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      subscribers: subscribers || [],
      stats
    });

  } catch (error) {
    console.error('[Newsletter API] ❌ Unexpected error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
