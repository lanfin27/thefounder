// 🔥 Next.js 캐시 비활성화 - 항상 최신 데이터 표시
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { FeaturedVisual } from '@/components/sections/FeaturedVisual';
import { NewsletterInline } from '@/components/sections/NewsletterInline';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { getFeaturedPosts, getLatestPosts } from '@/lib/posts';

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
