'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ThumbsUp, MessageCircle } from 'lucide-react';

import { BlogPost } from '@/types';

interface LatestPostsProps {
  posts: BlogPost[];
}

import { parsePostContent } from '@/utils/content';

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  } catch (error) {
    return '';
  }
}

export function LatestPosts({ posts }: LatestPostsProps) {
  console.log('🟢 LatestPosts - FINAL FIX: excerpt truncation + maxHeight!');
  console.log('📏 MAX_EXCERPT_LENGTH: 70');
  console.log(`📊 Posts: ${posts.length}`);

  return (
    <section className="space-y-6">
      <div className="mb-8">
        <h2 className="text-base md:text-lg font-bold text-gray-900">Latest</h2>
      </div>

      <div className="flex flex-col">
        {posts.map((post) => {
          const { title, excerpt } = parsePostContent(post);
          const excerptLength = excerpt.trim().length;
          console.log(`📝 Post: ${post.id.substring(0, 8)} | title: ${title.substring(0, 30)}... | excerptLength: ${excerptLength} | cover: ${post.cover ? '✅' : '❌'}`);

          return (
            <article key={post.id} className="py-10 border-b border-gray-100 last:border-0 first:pt-2">
              <Link href={`/posts/${post.slug}`} className="block group">
                {/* 🔴 모바일 레이아웃 - 카드 형태 (큰 이미지 + 제목 + 내용) */}
                <div className="block md:hidden">
                  <div className="flex flex-col gap-3">
                    {/* 이미지 - 꽉 찬 너비 */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                      {post.cover ? (
                        <Image
                          src={post.cover}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* 텍스트 영역 */}
                    <div className="flex flex-col gap-2">
                      {/* 제목 */}
                      <h3 className="text-lg font-bold leading-snug text-gray-900 line-clamp-2">
                        {title}
                      </h3>

                      {/* 발췌문 */}
                      {excerpt && excerpt.trim() && (
                        <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                          {excerpt}
                        </p>
                      )}

                      {/* 메타 정보 */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">
                          {post.categoryLabel || post.category}
                        </span>
                        <span className="text-gray-300">·</span>
                        <time className="whitespace-nowrap">
                          {formatDate(post.publishedDate)}
                        </time>
                        {post.readingTime && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{post.readingTime}분</span>
                          </>
                        )}
                        {((post.clapsCount || 0) > 0 || (post.commentsCount || 0) > 0) && (
                          <div className="flex items-center gap-2 ml-0.5">
                            {(post.clapsCount || 0) > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3" />
                                {post.clapsCount}
                              </span>
                            )}
                            {(post.commentsCount || 0) > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-3 h-3" />
                                {post.commentsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 데스크톱 레이아웃 (768px 이상) */}
                <div className="hidden md:block">
                  <div className="flex gap-6 items-start">
                    {/* 텍스트 영역 */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* 제목 - 2줄까지 */}
                      <h3 className="text-xl lg:text-2xl font-bold leading-tight text-gray-900 line-clamp-2 group-hover:text-green-primary transition-colors">
                        {title}
                      </h3>

                      {/* 발췌문 - 2줄 */}
                      {excerpt && excerpt.trim() && (
                        <p
                          className="text-base text-gray-600 line-clamp-2 leading-relaxed"
                          style={{
                            maxHeight: '52px', // 26px * 2 lines
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {excerpt}
                        </p>
                      )}

                      {/* 메타 정보 - 한 줄로 통합 */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm text-gray-500">
                        {/* 카테고리 */}
                        <span className="font-medium text-gray-700">
                          {post.categoryLabel || post.category}
                        </span>

                        <span className="text-gray-300">·</span>

                        {/* 날짜 */}
                        <time className="whitespace-nowrap">
                          {formatDate(post.publishedDate)}
                        </time>

                        {/* 읽기 시간 (있을 경우) */}
                        {post.readingTime && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{post.readingTime}분 읽기</span>
                          </>
                        )}

                        {/* 상호작용 아이콘 (좋아요/댓글) */}
                        {((post.clapsCount || 0) > 0 || (post.commentsCount || 0) > 0) && (
                          <div className="flex items-center gap-3 ml-1">
                            {(post.clapsCount || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {post.clapsCount}
                              </span>
                            )}
                            {(post.commentsCount || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {post.commentsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 데스크톱 이미지 - 반응형 크기 */}
                    <div className="flex-shrink-0 w-40 h-28 lg:w-60 lg:h-40">
                      {post.cover ? (
                        <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-100">
                          <Image
                            src={post.cover}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 1024px) 160px, 240px"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-md bg-gray-100"></div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 hover:text-gray-700 transition-colors"
        >
          See all
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </div>
    </section >
  );
}
