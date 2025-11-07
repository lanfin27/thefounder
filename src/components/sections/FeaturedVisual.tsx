import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';

interface FeaturedVisualProps {
  posts: BlogPost[];
}

export function FeaturedVisual({ posts }: FeaturedVisualProps) {
  // If no posts, show empty state
  if (posts.length === 0) {
    return (
      <section className="w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-gray-500">Featured 포스트가 없습니다.</p>
        </div>
      </section>
    );
  }

  const displayPosts = posts;

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 왼쪽 열: 포스트1 + 포스트5 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 포스트 1 */}
            <Link
              href={`/posts/${leftPost.slug}`}
              className="group block"
            >
              <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                {leftPost.cover && (
                  <Image
                    src={leftPost.cover}
                    alt={leftPost.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                  />
                )}
              </div>
              <div className="space-y-1">
                {leftPost.categoryLabel && (
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {leftPost.categoryLabel}
                  </span>
                )}
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                  {leftPost.title}
                </h3>
                {leftPost.publishedDate && (
                  <p className="text-xs text-gray-400">{new Date(leftPost.publishedDate).toLocaleDateString('ko-KR')}</p>
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
                  {extraPost.cover && (
                    <Image
                      src={extraPost.cover}
                      alt={extraPost.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  {extraPost.categoryLabel && (
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {extraPost.categoryLabel}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                    {extraPost.title}
                  </h3>
                  {extraPost.publishedDate && (
                    <p className="text-xs text-gray-400">{new Date(extraPost.publishedDate).toLocaleDateString('ko-KR')}</p>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* 🔥 중앙: 큰 카드 1개 (col-span-6) - 높이 자동 조정 */}
          <div className="lg:col-span-6">
            <Link
              href={`/posts/${centerPost.slug}`}
              className="group block h-full"
            >
              <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-lg mb-4">
                {centerPost.cover && (
                  <Image
                    src={centerPost.cover}
                    alt={centerPost.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                )}
                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* 텍스트를 이미지 위에 배치 */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {centerPost.categoryLabel && (
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white mb-3">
                      {centerPost.categoryLabel}
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors line-clamp-2">
                    {centerPost.title}
                  </h3>
                  {centerPost.summary && (
                    <p className="text-gray-200 text-sm line-clamp-2 mb-2">
                      {centerPost.summary}
                    </p>
                  )}
                  {centerPost.publishedDate && (
                    <p className="text-xs text-gray-300">{new Date(centerPost.publishedDate).toLocaleDateString('ko-KR')}</p>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* 오른쪽: 작은 카드 2개 (세로 배치) */}
          <div className="lg:col-span-3 space-y-6">
            {rightPosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group block"
              >
                <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                  {post.cover && (
                    <Image
                      src={post.cover}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  {post.categoryLabel && (
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {post.categoryLabel}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.publishedDate && (
                    <p className="text-xs text-gray-400">{new Date(post.publishedDate).toLocaleDateString('ko-KR')}</p>
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
