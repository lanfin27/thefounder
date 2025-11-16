/**
 * Notion 싱크 후 캐시 무효화 함수
 * 모든 레벨의 Next.js 캐시를 무효화합니다
 */

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * 포스트 관련 모든 캐시 무효화
 */
export async function revalidateAllPosts() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           STARTING CACHE REVALIDATION                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // 1. 홈페이지 캐시 무효화
    console.log('[Revalidation] 🏠 Revalidating homepage...');
    revalidatePath('/', 'page');
    console.log('[Revalidation] ✅ Homepage revalidated');

    // 2. 포스트 목록 페이지 캐시 무효화
    console.log('[Revalidation] 📋 Revalidating posts list...');
    revalidatePath('/posts', 'page');
    console.log('[Revalidation] ✅ Posts list revalidated');

    // 3. 카테고리별 페이지 캐시 무효화
    const categories = ['trend', 'insight', 'blog', 'success-story'];
    console.log(`[Revalidation] 🏷️  Revalidating ${categories.length} category pages...`);

    for (const category of categories) {
      revalidatePath(`/category/${category}`, 'page');
      console.log(`[Revalidation]   ✅ Category "${category}" revalidated`);
    }

    // 4. 모든 포스트 상세 페이지 캐시 무효화
    console.log('[Revalidation] 📄 Revalidating all post detail pages...');
    revalidatePath('/posts/[slug]', 'page');
    console.log('[Revalidation] ✅ All post detail pages revalidated');

    // 5. API 라우트 캐시 무효화
    console.log('[Revalidation] 🔌 Revalidating API routes...');
    revalidateTag('posts-api');
    revalidateTag('topics-api');
    console.log('[Revalidation] ✅ API routes revalidated');

    // 6. 레이아웃 캐시 무효화
    console.log('[Revalidation] 🎨 Revalidating layouts...');
    revalidatePath('/', 'layout');
    console.log('[Revalidation] ✅ Layouts revalidated');

    const duration = Date.now() - startTime;

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          CACHE REVALIDATION COMPLETED                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`[Revalidation] ⏱️  Duration: ${duration}ms`);
    console.log(`[Revalidation] 🕐 Completed at: ${new Date().toISOString()}\n`);

    return {
      success: true,
      duration,
      revalidated: [
        'homepage',
        'posts-list',
        ...categories.map(c => `category-${c}`),
        'post-details',
        'api-routes',
        'layouts'
      ]
    };

  } catch (error) {
    console.error('\n❌❌❌ [Revalidation] CACHE REVALIDATION FAILED ❌❌❌');
    console.error('[Revalidation] Error:', error);

    if (error instanceof Error) {
      console.error('[Revalidation] Message:', error.message);
      console.error('[Revalidation] Stack:', error.stack);
    }

    throw error;
  }
}

/**
 * 특정 포스트의 캐시만 무효화
 */
export async function revalidatePost(slug: string) {
  console.log(`[Revalidation] 🔄 Revalidating post: ${slug}`);

  try {
    // 포스트 상세 페이지
    revalidatePath(`/posts/${slug}`, 'page');

    // 포스트 목록 (이 포스트가 포함된)
    revalidatePath('/posts', 'page');
    revalidatePath('/', 'page');

    console.log(`[Revalidation] ✅ Post "${slug}" revalidated`);

    return { success: true, slug };

  } catch (error) {
    console.error(`[Revalidation] ❌ Failed to revalidate post: ${slug}`, error);
    throw error;
  }
}

/**
 * 개발 환경에서 전체 캐시 강제 클리어
 */
export async function clearAllCache() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Revalidation] ⚠️  clearAllCache() is only available in development');
    return { success: false, reason: 'Production environment' };
  }

  console.log('[Revalidation] 🗑️  Clearing all caches (development only)...');

  try {
    // Next.js 캐시 디렉토리 삭제
    const fs = require('fs');
    const path = require('path');

    const cacheDir = path.join(process.cwd(), '.next/cache');

    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('[Revalidation] ✅ Cache directory cleared');
    } else {
      console.log('[Revalidation] ℹ️  No cache directory found');
    }

    return { success: true };

  } catch (error) {
    console.error('[Revalidation] ❌ Failed to clear cache:', error);
    throw error;
  }
}
