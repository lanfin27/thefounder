import { BlogPost } from '@/types';
import { CATEGORY_TO_SLUG, CategorySlug } from '@/types/post';

/**
 * Get all posts from Supabase database
 * This is the single source of truth for all posts across all Notion sources
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    // Check if running on server or client
    if (typeof window === 'undefined') {
      // Server-side: Read from Supabase (single source of truth)
      console.log('🔍 [getAllPosts] Fetching posts from Supabase (server-side)');

      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      // Fetch all published posts from Supabase
      // Note: Posts are saved with English status 'published' from converter
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .in('status', ['published', '발행']) // Support both English and Korean status
        .order('published_date', { ascending: false });

      if (error) {
        console.error('❌ [getAllPosts] Supabase error:', error);
        throw error;
      }

      if (!posts || posts.length === 0) {
        console.log('⚠️ [getAllPosts] No posts found in Supabase');
        return [];
      }

      console.log(`✅ [getAllPosts] Fetched ${posts.length} posts from Supabase`);

      // Transform Supabase data to BlogPost format
      const blogPosts: BlogPost[] = posts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content || undefined,
        cover: post.cover || undefined,
        author: post.author || 'Anonymous',
        category: post.category || 'Uncategorized',
        categoryLabel: post.category || 'Uncategorized',
        tags: post.tags || [],
        isPremium: post.is_premium || false,
        status: post.status || '발행',
        publishedDate: post.published_date || new Date().toISOString(),
        readingTime: post.reading_time || 5,
        date: post.published_date || new Date().toISOString(),
        clapsCount: post.claps_count || 0,
        commentsCount: post.comments_count || 0,
      }));

      console.log(`📊 [getAllPosts] Categories in posts:`, [...new Set(blogPosts.map(p => p.category))]);
      console.log(`📊 [getAllPosts] Sample posts (first 2):`, blogPosts.slice(0, 2).map(p => ({
        id: p.id.substring(0, 8),
        title: p.title,
        slug: p.slug,
        category: p.category
      })));

      return blogPosts;
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

/**
 * Get a single post by slug from Supabase
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    if (typeof window === 'undefined') {
      // Server-side: Read from Supabase (single source of truth)
      console.log(`🔍 [getPostBySlug] Fetching post with slug: "${slug}" from Supabase`);

      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      // Fetch post from Supabase
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Post not found
          console.log(`⚠️ [getPostBySlug] Post not found: ${slug}`);
          return null;
        }
        console.error('❌ [getPostBySlug] Supabase error:', error);
        throw error;
      }

      if (!post) {
        console.log(`⚠️ [getPostBySlug] No post found with slug: ${slug}`);
        return null;
      }

      console.log(`✅ [getPostBySlug] Found post: "${post.title}"`);
      console.log(`📊 [getPostBySlug] Claps: ${post.claps_count || 0}, Comments: ${post.comments_count || 0}`);

      // Transform to BlogPost format (명시적으로 최신 데이터 설정)
      const blogPost: BlogPost = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content || '',
        cover: post.cover || undefined,
        author: post.author || 'Anonymous',
        category: post.category || 'Uncategorized',
        categoryLabel: post.category || 'Uncategorized',
        tags: post.tags || [],
        isPremium: post.is_premium || false,
        status: post.status || '발행',
        publishedDate: post.published_date || new Date().toISOString(),
        readingTime: post.reading_time || 5,
        date: post.published_date || new Date().toISOString(),
        clapsCount: post.claps_count || 0,
        commentsCount: post.comments_count || 0,
      };

      return blogPost;
    } else {
      // Client-side: Not typically used, but available if needed
      const allPosts = await getAllPosts();
      return allPosts.find(post => post.slug === slug) || null;
    }
  } catch (error) {
    console.error('❌ [getPostBySlug] Error fetching post by slug:', error);
    return null;
  }
}
