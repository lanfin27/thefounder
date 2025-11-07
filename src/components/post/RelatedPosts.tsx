'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/types'

interface RelatedPostsProps {
  posts: BlogPost[]
  currentPostSlug: string
}

export default function RelatedPosts({ posts, currentPostSlug }: RelatedPostsProps) {
  // 현재 포스트 제외하고 최대 3개만 표시
  const filteredPosts = posts.filter(post => post.slug !== currentPostSlug).slice(0, 3)

  if (filteredPosts.length === 0) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">관련 글</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}`}
            className="group"
          >
            {/* 커버 이미지 */}
            {post.cover && (
              <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={post.cover}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}

            {/* 카테고리 뱃지 */}
            {post.categoryLabel && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-3">
                {post.categoryLabel}
              </span>
            )}

            {/* 제목 */}
            <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 text-lg">
              {post.title}
            </h3>

            {/* 발췌문 */}
            {post.summary && (
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {post.summary}
              </p>
            )}

            {/* 메타 정보 */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{post.author}</span>
              <span>•</span>
              <span>
                {new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              {post.readingTime && (
                <>
                  <span>•</span>
                  <span>{post.readingTime}분 읽기</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
