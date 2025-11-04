'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface FeaturedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: number;
  image_url?: string;
}

// Mock data - 나중에 Admin에서 제어
const featuredPosts: FeaturedPost[] = [
  {
    id: '1',
    slug: 'founder-mindset',
    title: '위대한 창업가를 만드는 30가지 조언',
    excerpt: '실제로 성공한 창업가들의 공통점',
    category: '인사이트',
    readingTime: 8,
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&fit=crop',
  },
  {
    id: '2',
    slug: 'ai-coding',
    title: '코딩은 AI가 한다, 그럼 창업자는 뭘 해야 하나',
    excerpt: 'Product의 시대에서 Distribution의 시대로',
    category: '트렌드',
    readingTime: 6,
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=675&fit=crop',
  },
  {
    id: '3',
    slug: 'gpt-automation',
    title: '직접 만든 낭만GPT "김만반"에게 질문 해주세요',
    excerpt: '자동화로 매출 500% 성장',
    category: '사례',
    readingTime: 10,
    image_url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=675&fit=crop',
  },
  {
    id: '4',
    slug: 'side-project',
    title: '모두가 글로벌을 외치지만 한국의 자동차 금융 시장에 기회가 있습니다',
    excerpt: '월 100만원에서 1000만원까지',
    category: '사례',
    readingTime: 7,
    image_url: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=1200&h=675&fit=crop',
  },
  {
    id: '5',
    slug: 'saas-growth',
    title: 'SaaS 제품으로 월 $10K MRR 달성하기',
    excerpt: '0에서 시작한 SaaS 성장 스토리',
    category: '인사이트',
    readingTime: 9,
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop',
  },
  {
    id: '6',
    slug: 'kpop-startup',
    title: '혼돈의 KPOP 산업, 답은 어디에 있을까?',
    excerpt: 'K-POP 산업의 미래와 기회',
    category: '트렌드',
    readingTime: 5,
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=675&fit=crop',
  },
];

export function FeaturedVisual() {
  // 첫 번째는 크게, 나머지는 2x2 그리드
  const mainPost = featuredPosts[0];
  const gridPosts = featuredPosts.slice(1, 5);
  const lastPost = featuredPosts[5];

  return (
    <section className="mt-0 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - NO top spacing */}
        <div className="flex items-center justify-between mb-8 pt-6">
          <div>
            <span className="inline-block px-3 py-1 bg-green-light text-green-primary text-xs font-semibold rounded-full mb-2">
              FEATURED
            </span>
            <h2 className="text-3xl font-bold text-ink-900">
              주목할 만한 이야기
            </h2>
          </div>
          <Link
            href="/featured"
            className="hidden md:flex items-center gap-2 text-sm text-green-primary hover:text-green-hover font-medium transition-colors"
          >
            전체 보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Featured (Left - 2 columns on desktop) */}
          <Link
            href={`/post/${mainPost.slug}`}
            className="lg:col-span-2 group relative overflow-hidden rounded-xl bg-gray-900 block"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Background Image or Gradient */}
            {mainPost.image_url ? (
              <Image
                src={mainPost.image_url}
                alt={mainPost.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 66vw"
              />
            ) : (
              <div className="absolute inset-0">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
              </div>
            )}

            {/* Content Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full mb-3">
                {mainPost.category}
              </span>
              <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-green-light transition-colors leading-tight">
                {mainPost.title}
              </h3>
              <p className="text-white/80 text-sm mb-3 line-clamp-2">
                {mainPost.excerpt}
              </p>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <span>{mainPost.readingTime}분 읽기</span>
              </div>
            </div>
          </Link>

          {/* Right Column - 2x2 Grid */}
          <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {gridPosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="group relative overflow-hidden rounded-lg bg-gray-900 block"
                style={{ aspectRatio: '16/9' }}
              >
                {/* Background Image or Gradient */}
                {post.image_url ? (
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0">
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                  </div>
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium rounded-full mb-2">
                    {post.category}
                  </span>
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-green-light transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  <span className="text-white/60 text-[10px]">
                    {post.readingTime}분
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Featured */}
        <Link
          href={`/post/${lastPost.slug}`}
          className="mt-6 group relative overflow-hidden rounded-lg bg-gray-900 hidden lg:block"
          style={{ aspectRatio: '21/9' }}
        >
          {/* Background Image or Gradient */}
          {lastPost.image_url ? (
            <Image
              src={lastPost.image_url}
              alt={lastPost.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0">
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

          <div className="absolute left-0 top-1/2 -translate-y-1/2 p-8">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full mb-3">
              {lastPost.category}
            </span>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-light transition-colors max-w-xl leading-snug">
              {lastPost.title}
            </h3>
            <p className="text-white/80 text-sm max-w-md">
              {lastPost.excerpt}
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
