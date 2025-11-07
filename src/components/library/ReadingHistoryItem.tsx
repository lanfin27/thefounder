'use client'

import Link from 'next/link'
import { Clock, Eye } from 'lucide-react'
import type { ReadingHistory } from '@/types/library'

interface ReadingHistoryItemProps {
  item: ReadingHistory
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return '방금 전'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}일 전`
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}개월 전`
  return `${Math.floor(seconds / 31536000)}년 전`
}

export default function ReadingHistoryItem({ item }: ReadingHistoryItemProps) {
  // Use the post slug if available, otherwise fall back to post_id
  const postLink = item.post?.slug
    ? `/posts/${item.post.slug}`
    : `/posts/${item.post_id}`

  // Handle cases where post might not be found
  const postTitle = item.post?.title || `글 ID: ${item.post_id.substring(0, 8)}...`
  const postSummary = item.post?.summary
  const postCover = item.post?.cover

  return (
    <Link href={postLink}>
      <article className="flex gap-6 pb-6 border-b border-gray-100 hover:bg-gray-50 p-4 rounded-lg transition-colors group">
        {/* Post Info */}
        <div className="flex-1">
          {/* Post Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
            {postTitle}
          </h3>

          {/* Excerpt if available */}
          {postSummary && (
            <p className="text-gray-600 mb-3 line-clamp-2">{postSummary}</p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <time>{formatTimeAgo(item.last_read_at)}</time>
            </div>

            {item.read_count > 1 && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{item.read_count}번 읽음</span>
              </div>
            )}

            {item.read_progress > 0 && (
              <span>
                {item.read_progress}% 읽음
              </span>
            )}
          </div>

          {/* First Read Date */}
          <p className="text-xs text-gray-400 mt-2">
            처음 읽은 날: {formatDate(item.first_read_at)}
          </p>
        </div>

        {/* Thumbnail (if available) */}
        {postCover && (
          <div className="flex-shrink-0 w-32 h-32 relative overflow-hidden rounded bg-gray-100">
            <img
              src={postCover}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </article>
    </Link>
  )
}
