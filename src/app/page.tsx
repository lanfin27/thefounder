import { FeaturedVisual } from '@/components/sections/FeaturedVisual';
import { NewsletterInline } from '@/components/sections/NewsletterInline';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { getFeaturedPosts, getLatestPosts } from '@/lib/posts';

// 🔥 5분마다 재검증 (ISR)
export const revalidate = 300;

export default async function HomePage() {
  const startTime = Date.now();
  console.log('🏠 [HomePage] Starting render...');

  // Fetch real data from Notion
  const featuredPosts = await getFeaturedPosts(5);
  const latestPosts = await getLatestPosts(10);

  const loadTime = Date.now() - startTime;
  console.log(`🏠 [HomePage] Rendered in ${loadTime}ms`);

  return (
    <div className="min-h-screen bg-white">
      {/* Featured Section with real Notion data */}
      <FeaturedVisual posts={featuredPosts} />

      {/* Newsletter Section */}
      <NewsletterInline />

      {/* Latest Posts Section with real Notion data */}
      <LatestPosts posts={latestPosts} />
    </div>
  );
}
