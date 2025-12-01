import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { parsePostContent } from '@/utils/content';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">

        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h2 className="text-base md:text-lg font-bold text-gray-900">
            Featured
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
                    unoptimized
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
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-primary line-clamp-2">
                  {parsePostContent(leftPost).title}
                </h3>
                {/* 모바일에서 발췌문 표시 */}
                <p className="text-sm text-gray-600 line-clamp-2 mt-1 lg:hidden">
                  {parsePostContent(leftPost).excerpt}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {leftPost.publishedDate && (
                    <span>{new Date(leftPost.publishedDate).toLocaleDateString('ko-KR')}</span>
                  )}
                  {/* 좋아요/댓글 카운트 */}
                  {leftPost.clapsCount !== undefined && leftPost.clapsCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {leftPost.clapsCount}
                      </span>
                    </>
                  )}
                  {leftPost.commentsCount !== undefined && leftPost.commentsCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {leftPost.commentsCount}
                      </span>
                    </>
                  )}
                </div>
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
                      unoptimized
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
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-primary line-clamp-2">
                    {parsePostContent(extraPost).title}
                  </h3>
                  {/* 모바일에서 발췌문 표시 */}
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 lg:hidden">
                    {parsePostContent(extraPost).excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {extraPost.publishedDate && (
                      <span>{new Date(extraPost.publishedDate).toLocaleDateString('ko-KR')}</span>
                    )}
                    {/* 좋아요/댓글 카운트 */}
                    {extraPost.clapsCount !== undefined && extraPost.clapsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {extraPost.clapsCount}
                        </span>
                      </>
                    )}
                    {extraPost.commentsCount !== undefined && extraPost.commentsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {extraPost.commentsCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* 🔥 중앙: 큰 카드 1개 (col-span-6) - 높이 자동 조정 */}
          <div className="lg:col-span-6">
            {/* 🖥️ PC 버전: 그라데이션 오버레이 (768px 이상) */}
            <Link
              href={`/posts/${centerPost.slug}`}
              className="group hidden lg:block h-full"
            >
              <div className="relative w-full h-full overflow-hidden rounded-lg mb-4">
                {centerPost.cover && (
                  <Image
                    src={centerPost.cover}
                    alt={centerPost.title}
                    fill
                    unoptimized
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
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-primary transition-colors line-clamp-2">
                    {parsePostContent(centerPost).title}
                  </h3>
                  <p className="text-gray-200 text-sm line-clamp-2 mb-2">
                    {parsePostContent(centerPost).excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    {centerPost.publishedDate && (
                      <span>{new Date(centerPost.publishedDate).toLocaleDateString('ko-KR')}</span>
                    )}
                    {/* 좋아요/댓글 카운트 */}
                    {centerPost.clapsCount !== undefined && centerPost.clapsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {centerPost.clapsCount}
                        </span>
                      </>
                    )}
                    {centerPost.commentsCount !== undefined && centerPost.commentsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {centerPost.commentsCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* 📱 모바일 버전: 일반 카드 (768px 미만) */}
            <Link
              href={`/posts/${centerPost.slug}`}
              className="group block lg:hidden"
            >
              <div className="relative w-full overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '4/3' }}>
                {centerPost.cover && (
                  <Image
                    src={centerPost.cover}
                    alt={centerPost.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                )}
              </div>
              <div className="space-y-1">
                {centerPost.categoryLabel && (
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {centerPost.categoryLabel}
                  </span>
                )}
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-primary line-clamp-2">
                  {parsePostContent(centerPost).title}
                </h3>
                {/* 모바일에서 발췌문 표시 */}
                <p className="text-sm text-gray-600 line-clamp-2 mt-1 lg:hidden">
                  {parsePostContent(centerPost).excerpt}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {centerPost.publishedDate && (
                    <span>{new Date(centerPost.publishedDate).toLocaleDateString('ko-KR')}</span>
                  )}
                  {/* 좋아요/댓글 카운트 */}
                  {centerPost.clapsCount !== undefined && centerPost.clapsCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {centerPost.clapsCount}
                      </span>
                    </>
                  )}
                  {centerPost.commentsCount !== undefined && centerPost.commentsCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {centerPost.commentsCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* 오른쪽 열: 포스트3 + 포스트4 */}
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
                      unoptimized
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
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-primary line-clamp-2">
                    {parsePostContent(post).title}
                  </h3>
                  {/* 모바일에서 발췌문 표시 */}
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 lg:hidden">
                    {parsePostContent(post).excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {post.publishedDate && (
                      <span>{new Date(post.publishedDate).toLocaleDateString('ko-KR')}</span>
                    )}
                    {/* 좋아요/댓글 카운트 */}
                    {post.clapsCount !== undefined && post.clapsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {post.clapsCount}
                        </span>
                      </>
                    )}
                    {post.commentsCount !== undefined && post.commentsCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {post.commentsCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
