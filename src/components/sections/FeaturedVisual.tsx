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
}

interface FeaturedVisualProps {
  posts?: Post[];
}

export function FeaturedVisual({ posts = [] }: FeaturedVisualProps) {
  // 기본 포스트 데이터 (이미지 URL 포함)
  const defaultPosts: Post[] = [
    {
      id: '1',
      title: '위대한 창업가를 만드는 30가지 조언',
      slug: 'great-founder-30-tips',
      excerpt: '성공한 창업가들의 공통된 습관',
      category: '트렌드',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&fit=crop'
    },
    {
      id: '2',
      title: '코딩은 AI가 한다, 그럼 창업자는 뭘 해야 하나',
      slug: 'ai-age-founder-role',
      excerpt: 'AI 시대의 창업자 역할',
      category: '인사이트',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=675&fit=crop'
    },
    {
      id: '3',
      title: '성공 하려면? 실패하는 방법 한 가지만 피하면 된다',
      slug: 'how-to-succeed',
      excerpt: '실패 패턴 분석',
      category: '사례',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop'
    },
    {
      id: '4',
      title: '모든 것은 임직원 채용 방법에 따라 결정됩니다',
      slug: 'hiring-strategy',
      excerpt: '채용이 회사를 만든다',
      category: '블로그',
      image_url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=675&fit=crop'
    },
    {
      id: '5',
      title: 'SaaS로 $10K MRR 달성하기',
      slug: 'saas-10k-mrr',
      excerpt: 'B2B SaaS 성장 전략',
      category: '사례',
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&fit=crop'
    },
  ];

  const displayPosts = posts.length > 0 ? posts : defaultPosts;
  const featuredPost = displayPosts[0];
  const sidePosts = displayPosts.slice(1, 5);

  return (
    <section className="w-full bg-white">
      {/* Container - 낭만투자파트너스와 동일한 max-w-7xl */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            FEATURED
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            주목할 만한 이야기
          </h2>
        </div>

        {/* Grid Layout - gap-4로 공백 최소화 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: Main Featured Card */}
          <Link
            href={`/posts/${featuredPost.slug}`}
            className="group relative block overflow-hidden rounded-lg bg-gray-900"
            style={{
              aspectRatio: '16/9',
            }}
          >
            {/* Background Image */}
            {featuredPost.image_url && (
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={featuredPost.image_url}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  quality={85}
                />
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              {featuredPost.category && (
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-3">
                  {featuredPost.category}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2 line-clamp-2">
                {featuredPost.title}
              </h3>
              {featuredPost.excerpt && (
                <p className="text-gray-200 text-sm line-clamp-2">
                  {featuredPost.excerpt}
                </p>
              )}
            </div>
          </Link>

          {/* Right: 4 Small Cards in 2x2 Grid - gap-4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sidePosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group relative block overflow-hidden rounded-lg bg-gray-900"
                style={{
                  aspectRatio: '16/9',
                }}
              >
                {/* Background Image */}
                {post.image_url && (
                  <div className="absolute inset-0 w-full h-full">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      quality={85}
                    />
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  {post.category && (
                    <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs font-medium mb-2">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
