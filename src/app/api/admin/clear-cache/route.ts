import { NextRequest, NextResponse } from 'next/server';
import { clearAllCache, revalidateAllPosts } from '@/lib/cache/revalidation';

export const dynamic = 'force-dynamic';

/**
 * 개발 환경에서만 사용 가능한 캐시 클리어 API
 * POST /api/admin/clear-cache
 */
export async function POST(request: NextRequest) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          CACHE CLEAR REQUEST RECEIVED                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 프로덕션 환경에서는 차단
  if (process.env.NODE_ENV === 'production') {
    console.error('[API] ❌ Cache clear not allowed in production');
    return NextResponse.json(
      { success: false, error: 'Not allowed in production' },
      { status: 403 }
    );
  }

  const startTime = Date.now();

  try {
    const results: any = {
      clear: null,
      revalidate: null
    };

    // 방법 1: 캐시 디렉토리 삭제 (가장 강력)
    console.log('[API] 🗑️  Method 1: Deleting cache directory...\n');
    try {
      results.clear = await clearAllCache();
      console.log('[API] ✅ Cache directory cleared\n');
    } catch (clearError) {
      console.error('[API] ⚠️  Cache directory clear failed:', clearError);
      results.clear = {
        success: false,
        error: clearError instanceof Error ? clearError.message : 'Unknown error'
      };
    }

    // 방법 2: revalidate 호출 (Next.js 13+ 방식)
    console.log('[API] 🔄 Method 2: Revalidating all paths...\n');
    try {
      results.revalidate = await revalidateAllPosts();
      console.log('[API] ✅ All paths revalidated\n');
    } catch (revalidateError) {
      console.error('[API] ⚠️  Revalidation failed:', revalidateError);
      results.revalidate = {
        success: false,
        error: revalidateError instanceof Error ? revalidateError.message : 'Unknown error'
      };
    }

    const duration = Date.now() - startTime;

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           CACHE CLEAR COMPLETED                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`[API] 🗑️  Cache directory: ${results.clear?.success ? 'CLEARED ✅' : 'FAILED ❌'}`);
    console.log(`[API] 🔄 Revalidation: ${results.revalidate?.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log(`[API] ⏱️  Duration: ${duration}ms\n`);

    return NextResponse.json({
      success: results.clear?.success || results.revalidate?.success,
      message: 'Cache cleared successfully (development only)',
      data: {
        clear: results.clear,
        revalidate: results.revalidate,
        duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('\n❌❌❌ CACHE CLEAR FAILED ❌❌❌');
    console.error('[API] Error:', error);

    if (error instanceof Error) {
      console.error('[API] Message:', error.message);
      console.error('[API] Stack:', error.stack);
    }

    console.error(`[API] ⏱️  Duration before failure: ${duration}ms\n`);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      },
      { status: 500 }
    );
  }
}
