'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import BookmarkButton from './BookmarkButton';

interface PostCardImageLeftProps {
  post: BlogPost;
}

export default function PostCardImageLeft({ post }: PostCardImageLeftProps) {
  return (
    <article className="group">
      <Link href={`/posts/${post.slug}`} className="flex gap-8 items-start">

        {/* 왼쪽: 이미지 (크게 - 208x208px) */}
        <div className="relative w-52 h-52 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
          {post.cover && (
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="208px"
            />
          )}
        </div>

        {/* 오른쪽: 텍스트 */}
        <div className="flex-1 min-w-0">
          {/* 카테고리 */}
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full mb-3">
            {post.categoryLabel || post.category}
          </span>

          {/* 제목 (크게 - text-2xl) */}
          <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-600 transition-colors line-clamp-2">
            {post.title}
          </h3>

          {/* 요약 (3줄) */}
          <p className="text-base text-gray-600 mb-4 line-clamp-3">
            {post.summary}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{post.author}</span>
            <span>·</span>
            <span>{new Date(post.publishedDate).toLocaleDateString('ko-KR')}</span>
            <span>·</span>
            <span>{post.readingTime}분 읽기</span>
          </div>
        </div>
      </Link>

      {/* 북마크 */}
      <div className="flex justify-end mt-4">
        <BookmarkButton postId={post.id} />
      </div>
    </article>
  );
}
