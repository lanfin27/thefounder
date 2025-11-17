'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import BookmarkButton from '@/components/posts/BookmarkButton';
import { ThumbsUp, MessageCircle } from 'lucide-react';

interface LatestPostsProps {
  posts: BlogPost[];
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
          <h2 className="text-3xl font-bold text-gray-900">
            Latest
          </h2>
          <Link
            href="/posts"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Posts List - Medium 스타일 */}
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/posts/${post.slug}`} className="block">
                <div className="flex gap-4">
                  {/* 텍스트 콘텐츠 영역 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* 제목 - Medium 스타일: 2줄, font-semibold, text-base */}
                    <h3 className="text-base font-semibold leading-snug text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>

                    {/* 발췌문 - Medium 핵심: 2줄 제한, ... 표시 */}
                    {post.summary && (
                      <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                        {post.summary}
                      </p>
                    )}

                    {/* 메타 정보 영역 - 2줄 구조 */}
                    <div className="flex flex-col gap-1 pt-1">
                      {/* 첫 번째 줄: 카테고리 + 날짜 */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        {/* 카테고리 - 최대 너비 제한 */}
                        <span className="inline-block max-w-[100px] sm:max-w-[140px] font-medium truncate">
                          {post.categoryLabel || post.category}
                        </span>

                        {/* 구분자 */}
                        <span className="text-gray-400">·</span>

                        {/* 날짜 - 절대 줄바꿈 방지 */}
                        <time className="whitespace-nowrap flex-shrink-0">
                          {new Date(post.publishedDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </time>
                      </div>

                      {/* 두 번째 줄: 읽기시간 + 인게이지먼트 */}
                      {(post.readingTime || (post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {/* 읽기 시간 */}
                          {post.readingTime && (
                            <>
                              <span className="whitespace-nowrap flex-shrink-0">{post.readingTime}분 읽기</span>
                              {((post.clapsCount && post.clapsCount > 0) || (post.commentsCount && post.commentsCount > 0)) && (
                                <span className="text-gray-400 flex-shrink-0">·</span>
                              )}
                            </>
                          )}

                          {/* 좋아요 */}
                          {post.clapsCount !== undefined && post.clapsCount > 0 && (
                            <span className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                              <ThumbsUp className="w-3 h-3" />
                              <span>{post.clapsCount}</span>
                            </span>
                          )}

                          {/* 댓글 */}
                          {post.commentsCount !== undefined && post.commentsCount > 0 && (
                            <span className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                              <MessageCircle className="w-3 h-3" />
                              <span>{post.commentsCount}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 썸네일 이미지 - Medium 스타일: 80x80 (모바일), 96x96 (데스크톱) */}
                  {post.cover && (
                    <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                      <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                        <Image
                          src={post.cover}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 80px, 96px"
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
