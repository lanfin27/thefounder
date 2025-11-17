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
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Latest
        </h2>

        {/* Posts List (Medium 스타일) */}
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/posts/${post.slug}`} className="flex gap-6 items-start">

                {/* 왼쪽: 텍스트 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 제목 - 모바일 1줄, 데스크톱 2줄 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors line-clamp-1 md:line-clamp-2">
                    {post.title}
                  </h3>

                  {/* 요약 - 모바일 숨김 */}
                  <p className="text-base text-gray-600 mb-4 line-clamp-2 hidden sm:block">
                    {post.summary}
                  </p>

                  {/* 메타 정보 - 오버플로우 방지 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden">
                    <span className="font-medium truncate">{post.categoryLabel || post.category}</span>
                    <span className="flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{new Date(post.publishedDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                    <span className="hidden sm:inline flex-shrink-0">·</span>
                    <span className="hidden sm:inline flex-shrink-0">{post.readingTime}분 읽기</span>

                    {/* 👍 좋아요 개수 */}
                    {post.clapsCount !== undefined && post.clapsCount > 0 && (
                      <>
                        <span className="hidden sm:inline flex-shrink-0">·</span>
                        <span className="hidden sm:inline-flex items-center gap-1 flex-shrink-0">
                          <ThumbsUp className="w-3 h-3" />
                          {post.clapsCount}
                        </span>
                      </>
                    )}

                    {/* 💬 댓글 개수 */}
                    {post.commentsCount !== undefined && post.commentsCount > 0 && (
                      <>
                        <span className="hidden sm:inline flex-shrink-0">·</span>
                        <span className="hidden sm:inline-flex items-center gap-1 flex-shrink-0">
                          <MessageCircle className="w-3 h-3" />
                          {post.commentsCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 썸네일 이미지 */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {post.cover && (
                    <Image
                      src={post.cover}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 96px, 128px"
                    />
                  )}
                </div>
              </Link>

              {/* 북마크 버튼 */}
              <div className="flex justify-end mt-4">
                <BookmarkButton postId={post.id} />
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
