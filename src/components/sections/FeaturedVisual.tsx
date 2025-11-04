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
  // 기본 포스트 데이터
  const defaultPosts: Post[] = [
    {
      id: '1',
      title: '[책] 위대한 창업가를 만드는 30가지 조언',
      slug: 'great-founder-30-tips',
      excerpt: '성공한 창업가들의 공통된 습관과 사고방식',
      category: '트렌드',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&fit=crop',
      published_at: '2025년 6월 9일'
    },
    {
      id: '2',
      title: '코딩은 AI가 한다, 그럼 창업자는 뭘 해야 하나',
      slug: 'ai-age-founder',
      excerpt: 'AI 시대의 창업자 역할 재정의',
      category: '인사이트',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=675&fit=crop',
      published_at: '2025년 3월 5일'
    },
    {
      id: '3',
      title: '직접 만든 낭만GPT "김냅맨"에게 질문해주세요',
      slug: 'napkin-gpt',
      excerpt: '개인화된 AI 도구 만들기',
      category: '블로그',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop',
      published_at: '2025년 2월 27일'
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
  ];

  const displayPosts = posts.length > 0 ? posts : defaultPosts;
  const featuredPost = displayPosts[0];
  const sidePosts = displayPosts.slice(1, 4);

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

        {/* Grid Layout - 낭만파트너스 스타일 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Main Featured Card */}
          <Link
            href={`/posts/${featuredPost.slug}`}
            className="group"
          >
            {/* Image Container */}
            <div className="relative w-full overflow-hidden rounded-lg mb-4" style={{ aspectRatio: '16/9' }}>
              {featuredPost.image_url && (
                <Image
                  src={featuredPost.image_url}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              )}
            </div>

            {/* Text Content - 이미지 아래 */}
            <div className="space-y-2">
              {/* Category */}
              {featuredPost.category && (
                <span className="inline-block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {featuredPost.category}
                </span>
              )}

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">
                {featuredPost.title}
              </h3>

              {/* Excerpt */}
              {featuredPost.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-2">
                  {featuredPost.excerpt}
                </p>
              )}

              {/* Meta Info */}
              {featuredPost.published_at && (
                <p className="text-xs text-gray-400">
                  {featuredPost.published_at}
                </p>
              )}
            </div>
          </Link>

          {/* Right: 3 Small Cards */}
          <div className="space-y-6">
            {sidePosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group flex gap-4"
              >
                {/* Image - 왼쪽 */}
                <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                  {post.image_url && (
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="128px"
                    />
                  )}
                </div>

                {/* Text Content - 오른쪽 */}
                <div className="flex-1 space-y-1">
                  {/* Category */}
                  {post.category && (
                    <span className="inline-block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {post.category}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Date */}
                  {post.published_at && (
                    <p className="text-xs text-gray-400">
                      {post.published_at}
                    </p>
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
