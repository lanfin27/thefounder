import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Search API] 🔍 SEARCH REQUEST START');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';

    console.log('[Search API] 📝 Raw Query:', query);
    console.log('[Search API] 📂 Category:', category);

    if (!query || query.trim() === '') {
      console.log('[Search API] ⚠️ Empty query - returning empty results');
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'Empty query',
      });
    }

    const supabase = await createClient();
    const searchTerm = query.trim().toLowerCase();

    console.log('[Search API] 🔍 Search term (lowercase):', searchTerm);
    console.log('[Search API] 🔍 Search term length:', searchTerm.length);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: 먼저 모든 포스트 가져오기 (필터 없이)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 📦 Fetching ALL posts from database...');

    const { data: allPosts, error: allError } = await supabase
      .from('posts')
      .select('*')
      .limit(200);

    if (allError) {
      console.error('[Search API] ❌ Database error:', allError);
      return NextResponse.json({ error: 'Database error', details: allError }, { status: 500 });
    }

    console.log('[Search API] 📊 Total posts in database:', allPosts?.length || 0);

    if (!allPosts || allPosts.length === 0) {
      console.log('[Search API] ⚠️ No posts found in database!');
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'No posts in database',
        debug: {
          totalPosts: 0,
          searchTerm: searchTerm,
        }
      });
    }

    // 첫 3개 포스트 샘플 출력
    console.log('[Search API] 📋 Sample posts:');
    allPosts.slice(0, 3).forEach((post, idx) => {
      console.log(`  ${idx + 1}. Title: ${post.title}`);
      console.log(`     Status: ${post.status}`);
      console.log(`     Category: ${post.category}`);
      console.log(`     Content length: ${post.content?.length || 0}`);
      console.log(`     Content preview: ${post.content?.substring(0, 50)}...`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: published 필터링
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const publishedPosts = allPosts.filter(post =>
      post.status === 'published' && post.deleted_at === null
    );

    console.log('[Search API] ✓ Published posts:', publishedPosts.length);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: 카테고리 필터링
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const categoryFiltered = category === 'all'
      ? publishedPosts
      : publishedPosts.filter(post => post.category === category);

    console.log('[Search API] ✓ After category filter:', categoryFiltered.length);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: 검색 필터링 (제목 + 내용)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Search API] 🔍 Starting search filtering...');

    const results = categoryFiltered.filter((post, index) => {
      const title = (post.title || '').toLowerCase();
      const content = (post.content || '').toLowerCase();

      const titleMatch = title.includes(searchTerm);
      const contentMatch = content.includes(searchTerm);

      const isMatch = titleMatch || contentMatch;

      if (isMatch) {
        console.log(`[Search API] ✓✓✓ MATCH #${index + 1}: "${post.title}"`);
        if (titleMatch) {
          console.log(`     → Title contains "${searchTerm}"`);
          console.log(`     → Title: "${title}"`);
        }
        if (contentMatch) {
          console.log(`     → Content contains "${searchTerm}"`);
          const matchIndex = content.indexOf(searchTerm);
          const snippet = content.substring(Math.max(0, matchIndex - 30), matchIndex + 50);
          console.log(`     → Content snippet: "...${snippet}..."`);
        }
      }

      return isMatch;
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
        totalPosts: allPosts.length,
        publishedPosts: publishedPosts.length,
        categoryFiltered: categoryFiltered.length,
        matchedPosts: results.length,
      }
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[Search API] ❌❌❌ UNEXPECTED ERROR:', error);
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
