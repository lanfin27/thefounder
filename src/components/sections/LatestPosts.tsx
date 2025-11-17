'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import BookmarkButton from '@/components/posts/BookmarkButton';
import { ThumbsUp, MessageCircle } from 'lucide-react';

interface LatestPostsProps {
  posts: BlogPost[];
}

/**
 * 발췌문 자동 생성 함수
 * summary가 없으면 content에서 추출
 */
function getExcerpt(post: BlogPost): string {
  // 1순위: summary 필드
  if (post.summary && post.summary.trim()) {
    return post.summary.trim();
  }

  // 2순위: content에서 추출 (HTML 태그 제거)
  if (post.content) {
    const plainText = post.content
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/\s+/g, ' ')    // 여러 공백을 하나로
      .trim();

    // 첫 150자 추출
    if (plainText.length > 150) {
      return plainText.substring(0, 150) + '...';
    }
    return plainText;
  }

  return '';
}

/**
 * 날짜 포맷팅 함수
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  } catch {
    return '';
  }
}

export function LatestPosts({ posts }: LatestPostsProps) {
  if (posts.length === 0) {
    return (
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Latest</h2>
          <p className="text-center text-gray-500">최신 포스트가 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Latest</h2>
          <Link
            href="/posts"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => {
            const excerpt = getExcerpt(post);

            return (
              <article key={post.id} className="group">
                {/* 모바일 전용 레이아웃 (< 768px) */}
                <div className="block md:hidden">
                  <Link href={`/posts/${post.slug}`} className="block">
                    <div className="flex gap-3">
                      {/* 텍스트 영역 */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* 제목 - 2줄 */}
                        <h3 className="text-base font-semibold leading-tight text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>

                        {/* 발췌문 - 2줄 */}
                        {excerpt && (
                          <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                            {excerpt}
                          </p>
                        )}

                        {/* 메타 정보 - 2줄 구조 */}
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          {/* 줄 1: 카테고리 + 날짜 */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="inline-block max-w-[90px] font-medium truncate">
                              {post.categoryLabel || post.category}
                            </span>
                            <span className="text-gray-400">·</span>
                            <time className="whitespace-nowrap flex-shrink-0">
                              {formatDate(post.publishedDate)}
                            </time>
                          </div>

                          {/* 줄 2: 읽기시간 + 인게이지먼트 */}
                          {(post.readingTime || (post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              {post.readingTime && (
                                <>
                                  <span className="whitespace-nowrap">{post.readingTime}분</span>
                                  {((post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                                    <span className="text-gray-400">·</span>
                                  )}
                                </>
                              )}

                              {post.clapsCount !== undefined && post.clapsCount > 0 && (
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{post.clapsCount}</span>
                                </span>
                              )}

                              {post.commentsCount !== undefined && post.commentsCount > 0 && (
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{post.commentsCount}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 이미지 - 80x80 */}
                      {post.cover && (
                        <div className="flex-shrink-0 w-20 h-20">
                          <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={post.cover}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="80px"
                              priority={false}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* 북마크 버튼 */}
                  <div className="flex justify-end mt-3">
                    <BookmarkButton postId={post.id} />
                  </div>

                  {/* 구분선 */}
                  <div className="mt-5 border-b border-gray-200" />
                </div>

                {/* 데스크톱 레이아웃 (>= 768px) */}
                <div className="hidden md:block">
                  <Link href={`/posts/${post.slug}`} className="block">
                    <div className="flex gap-4">
                      {/* 텍스트 영역 */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* 제목 */}
                        <h3 className="text-base font-semibold leading-snug text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>

                        {/* 발췌문 */}
                        {excerpt && (
                          <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                            {excerpt}
                          </p>
                        )}

                        {/* 메타 정보 */}
                        <div className="flex flex-col gap-1 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="inline-block max-w-[140px] font-medium truncate">
                              {post.categoryLabel || post.category}
                            </span>
                            <span className="text-gray-400">·</span>
                            <time className="whitespace-nowrap flex-shrink-0">
                              {formatDate(post.publishedDate)}
                            </time>
                          </div>

                          {(post.readingTime || (post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {post.readingTime && (
                                <>
                                  <span className="whitespace-nowrap">{post.readingTime}분 읽기</span>
                                  {((post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                                    <span className="text-gray-400">·</span>
                                  )}
                                </>
                              )}

                              {post.clapsCount !== undefined && post.clapsCount > 0 && (
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{post.clapsCount}</span>
                                </span>
                              )}

                              {post.commentsCount !== undefined && post.commentsCount > 0 && (
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{post.commentsCount}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 이미지 - 96x96 */}
                      {post.cover && (
                        <div className="flex-shrink-0 w-24 h-24">
                          <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                            <Image
                              src={post.cover}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="96px"
                              priority={false}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* 북마크 버튼 */}
                  <div className="flex justify-end mt-4">
                    <BookmarkButton postId={post.id} />
                  </div>

                  {/* 구분선 */}
                  <div className="mt-6 border-b border-gray-200" />
                </div>
              </article>
            );
          })}
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
