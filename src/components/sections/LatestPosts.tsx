'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bookmark } from 'lucide-react';

// Latest Posts 데이터 (Mock)
const latestPosts = [
  {
    id: 1,
    title: '토스 이승건 대표가 말하는 Product-Market Fit 찾는 법',
    excerpt: '하나의 기능으로 성장을 완전히 조작할 수 있다는 믿음. 제품 성장의 핵심은 무엇인지 토스의 사례를 통해 알아봅니다.',
    category: '인사이트',
    date: 'Oct 27',
    readTime: '11분 읽기',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
    slug: 'product-market-fit',
  },
  {
    id: 2,
    title: '당근마켓은 어떻게 지역 커뮤니티를 장악했나',
    excerpt: '하이퍼로컬 비즈니스의 성공 방정식을 당근마켓의 사례를 통해 분석합니다.',
    category: '사례',
    date: 'Oct 26',
    readTime: '9분 읽기',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
    slug: 'daangn-market',
  },
  {
    id: 3,
    title: '개발자 없이 월 $10K MRR 달성한 노코드 SaaS 스토리',
    excerpt: 'Webflow, Airtable, Zapier만으로 글로벌 SaaS를 만든 1인 창업자의 여정',
    category: '사례',
    date: 'Oct 25',
    readTime: '15분 읽기',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop',
    slug: '10k-mrr-nocode',
  },
  {
    id: 4,
    title: 'ChatGPT를 활용한 콘텐츠 자동화 시스템 구축',
    excerpt: 'AI를 활용하여 콘텐츠 제작 시간을 80% 단축한 실전 사용 사례와 구체적인 방법론',
    category: '트렌드',
    date: 'Oct 24',
    readTime: '12분 읽기',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=400&fit=crop',
    slug: 'chatgpt-content-automation',
  },
  {
    id: 5,
    title: '뉴스레터로 월 $20K 버는 1인 창업가의 비법',
    excerpt: 'Substack과 beehiiv를 활용한 뉴스레터 비즈니스 성장 전략',
    category: '사례',
    date: 'Oct 23',
    readTime: '10분 읽기',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop',
    slug: 'newsletter-20k',
  },
];

export function LatestPosts() {
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Latest
        </h2>

        {/* Posts List (Medium 스타일) */}
        <div className="space-y-8">
          {latestPosts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/posts/${post.slug}`} className="flex gap-6 items-start">
                
                {/* 왼쪽: 텍스트 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 제목 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* 요약 */}
                  <p className="text-base text-gray-600 mb-4 line-clamp-2 hidden sm:block">
                    {post.excerpt}
                  </p>

                  {/* 메타 정보 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium">{post.category}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{post.readTime}</span>
                  </div>
                </div>

                {/* 오른쪽: 썸네일 이미지 */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 96px, 128px"
                  />
                </div>
              </Link>

              {/* 북마크 버튼 */}
              <div className="flex justify-end mt-4">
                <button
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Bookmark"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: 북마크 기능 구현
                  }}
                >
                  <Bookmark className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              {/* 구분선 */}
              <div className="mt-8 border-b border-gray-200" />
            </article>
          ))}
        </div>

        {/* 더보기 버튼 */}
        <div className="mt-12 text-center">
          <Link
            href="/posts"
            className="inline-flex items-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-full hover:bg-gray-900 hover:text-white transition-all"
          >
            더 많은 글 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
