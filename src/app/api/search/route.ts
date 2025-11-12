import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Search API] 🔍 SEARCH START');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';

    console.log('[Search API] 📝 Query:', query);
    console.log('[Search API] 📂 Category filter:', category);

    if (!query || query.trim() === '') {
      console.log('[Search API] ⚠️ Empty query');
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'Empty query',
      });
    }

    const supabase = await createClient();
    const searchTerm = query.trim().toLowerCase();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: 모든 포스트 가져오기
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { data: allPosts, error: allError } = await supabase
      .from('posts')
      .select('*')
      .limit(200);

    if (allError || !allPosts) {
      console.error('[Search API] ❌ Database error:', allError);
      return NextResponse.json({
        error: 'Database error',
        details: allError
      }, { status: 500 });
    }

    console.log('[Search API] 📊 Total posts fetched:', allPosts.length);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 카테고리 값 확인 (디버깅)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const uniqueCategories = [...new Set(allPosts.map(p => p.category))];
    console.log('[Search API] 📋 Unique categories in DB:', uniqueCategories);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: deleted_at 필터링
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const activePosts = allPosts.filter(post => !post.deleted_at);
    console.log('[Search API] ✓ Active posts:', activePosts.length);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: 카테고리 필터링 (강화된 로깅)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let categoryFiltered = activePosts;

    if (category !== 'all') {
      console.log(`[Search API] 🏷️ Filtering by category: "${category}"`);

      categoryFiltered = activePosts.filter(post => {
        const postCategory = post.category;
        const matches = postCategory === category;

        if (!matches && postCategory) {
          console.log(`[Search API]   ✗ Post "${post.title}": category="${postCategory}" (expected="${category}")`);
        }

        return matches;
      });

      console.log(`[Search API] ✓ Posts matching category "${category}":`, categoryFiltered.length);

      // 카테고리 매칭 안 되면 경고
      if (categoryFiltered.length === 0) {
        console.log(`[Search API] ⚠️ No posts found with category="${category}"`);
        console.log(`[Search API] 💡 Available categories:`, uniqueCategories);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: 검색 필터링 (제목 + 내용)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔍 Searching for:', searchTerm);

    const results = categoryFiltered.filter((post) => {
      const title = (post.title || '').toLowerCase();
      const content = (post.content || '').toLowerCase();

      const titleMatch = title.includes(searchTerm);
      const contentMatch = content.includes(searchTerm);

      if (titleMatch || contentMatch) {
        console.log(`[Search API] ✓ Match: "${post.title}" (category: ${post.category})`);
      }

      return titleMatch || contentMatch;
    });

    console.log('[Search API] ✅ FINAL RESULTS:', results.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // excerpt 생성
    const resultsWithExcerpt = results.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.content
        ? post.content.substring(0, 150).replace(/[#*_`\n]/g, ' ').trim() + '...'
        : '',
      category: post.category,
      thumbnail_url: post.thumbnail_url,
      created_at: post.created_at,
      claps_count: post.claps_count || 0,
      comments_count: post.comments_count || 0,
    }));

    return NextResponse.json({
      results: resultsWithExcerpt.slice(0, 50),
      count: resultsWithExcerpt.length,
      method: 'javascript-filter',
      debug: {
        searchTerm: searchTerm,
        categoryFilter: category,
        totalPosts: allPosts.length,
        activePosts: activePosts.length,
        categoryFiltered: categoryFiltered.length,
        matchedPosts: results.length,
        availableCategories: uniqueCategories,
      }
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[Search API] ❌ ERROR:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
