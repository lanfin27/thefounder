'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock } from 'lucide-react'

interface ReadingHistoryItem {
  id: string
  post_id: string
  first_read_at: string
  last_read_at: string
  read_count: number
  read_progress: number
  post?: {
    id: string
    slug: string
    title: string
    summary?: string
    cover?: string
    category?: string
    readingTime?: number
  }
}

interface ReadingHistoryPostCardProps {
  item: ReadingHistoryItem
}

export default function ReadingHistoryPostCard({ item }: ReadingHistoryPostCardProps) {
  // Handle missing post data
  if (!item.post) {
    return (
      <div className="border-b border-gray-200 pb-6">
        <p className="text-sm text-gray-500">삭제된 글입니다</p>
        <p className="text-xs text-gray-400 mt-1">
          처음 읽음: {new Date(item.first_read_at).toLocaleDateString('ko-KR')}
        </p>
      </div>
    )
  }

  const { post } = item

  return (
    <article className="border-b border-gray-200 pb-6">
      <Link
        href={`/posts/${post.slug}`}
        className="flex gap-6 hover:opacity-80 transition-opacity"
      >
        {/* Post Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.summary && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {post.summary}
            </p>
          )}

          {/* Reading Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {/* Last Read Time */}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <time>
                {formatDistanceToNow(new Date(item.last_read_at), {
                  addSuffix: true,
                  locale: ko
                })} 읽음
              </time>
            </div>

            {/* Reading Time */}
            {post.readingTime && (
              <>
                <span>·</span>
                <span>{post.readingTime}분 읽기</span>
              </>
            )}

            {/* Category */}
            {post.category && (
              <>
                <span>·</span>
                <span className="text-green-600">{post.category}</span>
              </>
            )}
          </div>

          {/* First Read Date */}
          <p className="text-xs text-gray-400">
            처음 읽음: {new Date(item.first_read_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* Thumbnail */}
        {post.cover && (
          <div className="flex-shrink-0">
            <img
              src={post.cover}
              alt={post.title}
              className="w-32 h-32 object-cover rounded"
            />
          </div>
        )}
      </Link>
    </article>
  )
}
