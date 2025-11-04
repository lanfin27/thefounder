import { FeaturedVisual } from '@/components/sections/FeaturedVisual';
import { NewsletterInline } from '@/components/sections/NewsletterInline';
import { LatestStoriesInfinite } from '@/components/sections/LatestStoriesInfinite';

// Mock data
const latestStories = [
  {
    id: '1',
    slug: 'product-market-fit',
    title: '토스 이승건 대표가 말하는 Product-Market Fit 찾는 법',
    excerpt: '하나의 기능으로 상황을 완전히 조작할 수 있다는 믿음. 제품 성장의 핵심은 무엇인지 토스의 사례를 통해 알아봅니다.',
    category: '인사이트',
    publishedAt: 'Oct 27',
    readingTime: 11,
  },
  {
    id: '2',
    slug: 'local-community',
    title: '당근마켓은 어떻게 지역 커뮤니티를 장악했나',
    excerpt: '하이퍼로컬 비즈니스의 성공 방정식을 당근마켓의 사례를 통해 분석합니다.',
    category: '사례',
    publishedAt: 'Oct 26',
    readingTime: 9,
  },
  {
    id: '3',
    slug: 'nocode-saas',
    title: '개발자 없이 월 $10K MRR 달성한 노코드 SaaS 스토리',
    excerpt: 'Webflow, Airtable, Zapier만으로 글로벌 SaaS를 만든 1인 창업가의 여정',
    category: '사례',
    publishedAt: 'Oct 25',
    readingTime: 15,
  },
  {
    id: '4',
    slug: 'chatgpt-automation',
    title: 'ChatGPT를 활용한 콘텐츠 자동화 시스템 구축',
    excerpt: 'AI를 활용하여 콘텐츠 제작 시간을 90% 단축한 실전 사례와 구체적인 방법론',
    category: '트렌드',
    publishedAt: 'Oct 24',
    readingTime: 12,
  },
  {
    id: '5',
    slug: 'newsletter-business',
    title: '뉴스레터로 월 $20K 버는 1인 창업가의 비법',
    excerpt: 'Substack과 beehiiv를 활용한 뉴스레터 비즈니스 성장 전략',
    category: '사례',
    publishedAt: 'Oct 23',
    readingTime: 10,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* NO padding, NO margin, NO gaps */}
      <FeaturedVisual />

      {/* Newsletter - Featured 바로 아래 */}
      <NewsletterInline />

      {/* Latest Stories - Infinite Scroll */}
      <LatestStoriesInfinite initialStories={latestStories} />
    </div>
  );
}
