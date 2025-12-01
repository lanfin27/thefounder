import type { Metadata } from 'next'

// 🔥 Next.js 캐시 비활성화 - 항상 최신 데이터 표시
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { FeaturedVisual } from '@/components/sections/FeaturedVisual';
import { NewsletterInline } from '@/components/sections/NewsletterInline';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { getFeaturedPosts, getLatestPosts } from '@/lib/posts';

// 홈페이지 메타데이터
export const metadata: Metadata = {
  title: '홈',
  description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요. 최신 창업 트렌드, 사업 아이템, 투자 유치 정보부터 1인 창업 성공 사례까지 모든 정보를 한곳에서 확인하세요.',
  keywords: ['창업 플랫폼', '스타트업 뉴스', '창업 아이디어', '사업 아이템', '투자 유치', '1인 창업', '소자본 창업', '창업 성공 사례'],
  openGraph: {
    title: 'The Founder - 한국 1인 창업가를 위한 인사이트 플랫폼',
    description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요.',
    url: 'https://thefounder.co.kr',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Founder 메인 페이지'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Founder - 한국 1인 창업가를 위한 인사이트 플랫폼',
    description: '성공한 창업가들의 인사이트와 창업 노하우를 만나보세요.',
    images: ['/og-image.png']
  },
  alternates: {
    canonical: 'https://thefounder.co.kr'
  }
};

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
      <h1 className="sr-only">The Founder - 한국 1인 창업가를 위한 인사이트</h1>
      {/* Featured Section with real Notion data */}
      <FeaturedVisual posts={featuredPosts} />

      {/* Newsletter Section */}
      <NewsletterInline />

      {/* Latest Posts Section with real Notion data */}
      {/* Latest Posts Section with container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <LatestPosts posts={latestPosts} />
      </div>
    </div>
  );
}
