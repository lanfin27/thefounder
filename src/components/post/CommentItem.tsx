'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import CommentLikeButton from '@/components/comments/CommentLikeButton'

interface CommentItemProps {
  comment: {
    id: string
    user_name: string
    user_email: string
    content: string
    created_at: string
    user_id: string
    likes_count?: number // Added: like count
    user_has_liked?: boolean // Added: user like status
  }
  currentUserId?: string
  onDelete: (commentId: string) => void
  onReply?: () => void
  isReply?: boolean
}

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  isReply = false
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(comment.id)
    setIsDeleting(false)
  }

  const isOwner = currentUserId === comment.user_id

  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {comment.user_name[0].toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-gray-900">{comment.user_name}</span>
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: ko
            })}
          </span>
          {isReply && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              답글
            </span>
          )}
        </div>

        {/* Comment Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-800 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3">
          {/* Like Button */}
          <CommentLikeButton
            commentId={comment.id}
            initialLikes={comment.likes_count || 0}
            initialUserHasLiked={comment.user_has_liked || false}
            size="sm"
          />

          {onReply && !isReply && (
            <button
              onClick={onReply}
              className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              답글
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors disabled:opacity-50"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
