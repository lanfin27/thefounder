'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import BookmarkButton from './BookmarkButton';
import { ThumbsUp, MessageCircle } from 'lucide-react';

interface PostCardImageRightProps {
  post: BlogPost;
}

export default function PostCardImageRight({ post }: PostCardImageRightProps) {
  return (
    <article className="group">
      <Link href={`/posts/${post.slug}`} className="flex gap-6 items-start">

        {/* 왼쪽: 텍스트 */}
        <div className="flex-1 min-w-0">
          {/* 제목 (보통 - text-xl) */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors line-clamp-2">
            {post.title}
          </h3>

          {/* 요약 (2줄) */}
          <p className="text-base text-gray-600 mb-4 line-clamp-2">
            {post.summary}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{post.categoryLabel || post.category}</span>
            <span>·</span>
            <span>{new Date(post.publishedDate).toLocaleDateString('ko-KR')}</span>
            <span>·</span>
            <span>{post.readingTime}분 읽기</span>

            {/* 👍 좋아요 개수 */}
            {post.clapsCount !== undefined && post.clapsCount > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {post.clapsCount}
                </span>
              </>
            )}

            {/* 💬 댓글 개수 */}
            {post.commentsCount !== undefined && post.commentsCount > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {post.commentsCount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 오른쪽: 이미지 (작게 - 128x128px) */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {post.cover && (
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="128px"
            />
          )}
        </div>
      </Link>

      {/* 북마크 */}
      <div className="flex justify-end mt-4">
        <BookmarkButton postId={post.slug} />
      </div>
    </article>
  );
}
