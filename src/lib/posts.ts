import { BlogPost } from '@/types';
import { CATEGORY_TO_SLUG, CategorySlug } from '@/types/post';

// 서버 사이드에서 Notion 데이터 가져오기
// 클라이언트 사이드에서는 API route를 사용
export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    // Check if running on server or client
    if (typeof window === 'undefined') {
      // Server-side: import directly from converter
      console.log('🔍 [getAllPosts] Fetching posts from Notion (server-side)');
      const { getAllPosts: getPostsFromNotion } = await import('@/lib/notion/converter');
      const posts = await getPostsFromNotion(false);  // 🔥 Load metadata only for list views
      console.log(`✅ [getAllPosts] Fetched ${posts.length} posts from Notion (metadata only)`);
      console.log(`📊 [getAllPosts] Categories in posts:`, [...new Set(posts.map(p => p.category))]);
      return posts;
    } else {
      // Client-side: fetch from API
      console.log('🔍 [getAllPosts] Fetching posts from API (client-side)');
      const response = await fetch('/api/posts', {
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('❌ [getAllPosts] Failed to fetch posts:', response.statusText);
        return [];
      }

      const posts = await response.json();
      console.log(`✅ [getAllPosts] Fetched ${posts.length} posts from API`);
      return posts;
    }
  } catch (error) {
    console.error('❌ [getAllPosts] Error fetching posts:', error);
    return [];
  }
}

export async function getPostsByCategory(categorySlug: CategorySlug): Promise<BlogPost[]> {
  console.log(`\n🔍 [getPostsByCategory] Fetching posts for category: "${categorySlug}"`);

  const allPosts = await getAllPosts();
  console.log(`📊 [getPostsByCategory] Total posts available: ${allPosts.length}`);

  // Log all unique categories found in posts
  const uniqueCategories = [...new Set(allPosts.map(p => p.category))];
  console.log(`📊 [getPostsByCategory] Unique categories in posts:`, uniqueCategories);

  // Filter posts using CATEGORY_TO_SLUG for normalization (Korean → English slug)
  const filtered = allPosts.filter(post => {
    const postCategory = post.category;  // Korean category from DB: '트렌드', '인사이트', etc.
    const normalizedPostCategory = CATEGORY_TO_SLUG[postCategory as keyof typeof CATEGORY_TO_SLUG] || postCategory;
    const matches = normalizedPostCategory === categorySlug;

    if (matches) {
      console.log(`✅ [getPostsByCategory] Match found: "${post.title}" (category: "${postCategory}" → "${normalizedPostCategory}")`);
    }

    return matches;
  });

  console.log(`✅ [getPostsByCategory] Filtered ${filtered.length} posts for category "${categorySlug}"`);

  if (filtered.length === 0) {
    console.warn(`⚠️  [getPostsByCategory] No posts found for category "${categorySlug}". Check CATEGORY_MAPPING in types/post.ts`);
    console.log(`💡 [getPostsByCategory] Available categories:`, uniqueCategories);
  }

  return filtered;
}

export async function getFeaturedPosts(limit: number = 5): Promise<BlogPost[]> {
  const allPosts = await getAllPosts();
  const featured = allPosts.filter(post => post.featured);

  // If not enough featured posts, supplement with recent posts
  if (featured.length < limit) {
    const recent = allPosts
      .filter(post => !post.featured)
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit - featured.length);
    return [...featured, ...recent];
  }

  return featured.slice(0, limit);
}

export async function getLatestPosts(limit: number = 10): Promise<BlogPost[]> {
  const allPosts = await getAllPosts();
  return allPosts
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .slice(0, limit);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    if (typeof window === 'undefined') {
      // Server-side: import directly from converter
      const { getPostBySlug: getPostFromNotion } = await import('@/lib/notion/converter');
      return await getPostFromNotion(slug);
    } else {
      // Client-side: Not typically used, but available if needed
      const allPosts = await getAllPosts();
      return allPosts.find(post => post.slug === slug) || null;
    }
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }
}
