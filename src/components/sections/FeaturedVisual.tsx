'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  image_url?: string;
  author?: string;
  published_at?: string;
}

interface FeaturedVisualProps {
  posts?: Post[];
}

export function FeaturedVisual({ posts = [] }: FeaturedVisualProps) {
  // 기본 포스트 5개
  const defaultPosts: Post[] = [
    {
      id: '1',
      title: '[책] 위대한 창업가를 만드는 30가지 조언',
      slug: 'great-founder-30-tips',
      excerpt: '성공한 창업가들의 공통된 습관',
      category: '트렌드',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&fit=crop',
      published_at: '2025년 6월 9일'
    },
    {
      id: '2',
      title: '직접 만든 낭만GPT "김냅맨"에게 질문해주세요',
      slug: 'napkin-gpt',
      excerpt: '개인화된 AI 도구 만들기',
      category: '블로그',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=675&fit=crop',
      published_at: '2025년 3월 5일'
    },
    {
      id: '3',
      title: '코딩은 AI가 한다, 그럼 창업자는 뭘 해야 하나',
      slug: 'ai-age-founder',
      excerpt: 'AI 시대의 창업자 역할',
      category: '관점',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop',
      published_at: '2025년 8월 14일'
    },
    {
      id: '4',
      title: '모두가 글로벌을 외치지만 한국의 자동차 금융 시장에 기회가 있습니다!',
      slug: 'korea-auto-finance',
      excerpt: '국내 시장의 숨겨진 기회',
      category: '사례',
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&fit=crop',
      published_at: '2025년 1월 17일'
    },
    {
      id: '5',
      title: '혼돈의 KPOP 산업, 답은 어디에 있을까?',
      slug: 'kpop-industry',
      excerpt: 'K-POP 시장 분석',
      category: '사례',
      image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=675&fit=crop',
      published_at: '2025년 1월 17일'
    },
  ];

  const displayPosts = posts.length > 0 ? posts : defaultPosts;

  // 🚨 낭만투자파트너스 레이아웃: 왼쪽 1개 + 중앙 1개 (큰) + 오른쪽 2개
  const leftPost = displayPosts[0];
  const centerPost = displayPosts[1]; // 중앙 큰 포스트
  const rightPosts = displayPosts.slice(2, 4); // 오른쪽 2개
  const extraPost = displayPosts[4]; // 🆕 5번째 포스트

  return (
    <section className="w-full bg-white border-b border-gray-100">
      {/* Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            FEATURED
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            주목할 만한 이야기
          </h2>
        </div>

        {/* 🔥 낭만투자파트너스 레이아웃: (1+5) + 2(큰) + (3+4) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* 왼쪽 열: 포스트1 + 포스트5 */}
          <div className="space-y-6">
            {/* 포스트 1 */}
            <Link
              href={`/posts/${leftPost.slug}`}
              className="group block"
            >
              <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                {leftPost.image_url && (
                  <Image
                    src={leftPost.image_url}
                    alt={leftPost.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                  />
                )}
              </div>
              <div className="space-y-1">
                {leftPost.category && (
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {leftPost.category}
                  </span>
                )}
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                  {leftPost.title}
                </h3>
                {leftPost.published_at && (
                  <p className="text-xs text-gray-400">{leftPost.published_at}</p>
                )}
              </div>
            </Link>

            {/* 포스트 5 */}
            {extraPost && (
              <Link
                href={`/posts/${extraPost.slug}`}
                className="group block"
              >
                <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                  {extraPost.image_url && (
                    <Image
                      src={extraPost.image_url}
                      alt={extraPost.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  {extraPost.category && (
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {extraPost.category}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                    {extraPost.title}
                  </h3>
                  {extraPost.published_at && (
                    <p className="text-xs text-gray-400">{extraPost.published_at}</p>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* 중앙: 큰 카드 1개 (col-span-2) */}
          <Link
            href={`/posts/${centerPost.slug}`}
            className="group lg:col-span-2"
          >
            <div className="relative w-full overflow-hidden rounded-lg mb-4" style={{ aspectRatio: '16/9' }}>
              {centerPost.image_url && (
                <Image
                  src={centerPost.image_url}
                  alt={centerPost.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              )}
            </div>
            <div className="space-y-2">
              {centerPost.category && (
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {centerPost.category}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                {centerPost.title}
              </h3>
              {centerPost.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-2">
                  {centerPost.excerpt}
                </p>
              )}
              {centerPost.published_at && (
                <p className="text-xs text-gray-400">{centerPost.published_at}</p>
              )}
            </div>
          </Link>

          {/* 오른쪽: 작은 카드 2개 (세로 배치) */}
          <div className="space-y-6">
            {rightPosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group block"
              >
                <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                  {post.image_url && (
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  {post.category && (
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.published_at && (
                    <p className="text-xs text-gray-400">{post.published_at}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
