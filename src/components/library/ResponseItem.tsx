'use client'

import Link from 'next/link'
import { MessageCircle, ThumbsUp } from 'lucide-react'
import type { UserResponse } from '@/types/library'

interface ResponseItemProps {
  response: UserResponse
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ResponseItem({ response }: ResponseItemProps) {
  // Link to the post with comment anchor
  const postLink = response.post?.slug
    ? `/posts/${response.post.slug}#comment-${response.id}`
    : `/posts/${response.post_id}#comment-${response.id}`

  const postTitle = response.post?.title || `글 ID: ${response.post_id.substring(0, 8)}...`

  return (
    <article className="border-b border-gray-100 pb-6 last:border-b-0">
      {/* Post Title Link */}
      <Link
        href={postLink}
        className="text-sm text-gray-600 hover:text-gray-900 mb-3 block font-medium"
      >
        {postTitle}
      </Link>

      {/* Comment Content */}
      <div className="mb-3">
        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
          {response.content}
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <time>{formatDate(response.created_at)}</time>

        {response.likes_count > 0 && (
          <>
            <span>·</span>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{response.likes_count}</span>
            </div>
          </>
        )}

        {response.replies_count > 0 && (
          <>
            <span>·</span>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{response.replies_count}개 답글</span>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
