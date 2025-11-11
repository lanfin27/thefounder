'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CommentLikeButtonProps {
  commentId: string
  initialLikes?: number
  initialUserHasLiked?: boolean
  size?: 'sm' | 'md'
}

export default function CommentLikeButton({
  commentId,
  initialLikes = 0,
  initialUserHasLiked = false,
  size = 'sm',
}: CommentLikeButtonProps) {
  const router = useRouter()
  const [likes, setLikes] = useState(initialLikes)
  const [hasLiked, setHasLiked] = useState(initialUserHasLiked)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleLike = async () => {
    // Prevent multiple clicks
    if (isLoading) {
      console.log('⏳ [CommentLikeButton] Already processing...')
      return
    }

    setIsLoading(true)
    console.log(`🔄 [CommentLikeButton] Toggling like for comment: ${commentId}`)
    console.log(`📊 [CommentLikeButton] Current state - hasLiked: ${hasLiked}, likes: ${likes}`)

    try {
      // Determine action: add or remove like
      const method = hasLiked ? 'DELETE' : 'POST'
      const action = hasLiked ? 'Removing' : 'Adding'
      console.log(`➡️ [CommentLikeButton] ${action} like...`)

      const response = await fetch(`/api/comments/${commentId}/like`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      console.log(`📥 [CommentLikeButton] Response:`, data)

      // Handle authentication error
      if (response.status === 401) {
        console.log('🔒 [CommentLikeButton] User not authenticated, redirecting to login...')
        router.push('/auth/login')
        return
      }

      // Handle error responses
      if (!response.ok) {
        console.error('❌ [CommentLikeButton] Error:', data.error)

        // If already liked/unliked, just refresh to sync
        if (data.alreadyLiked || data.message === 'No like to remove') {
          console.log('🔄 [CommentLikeButton] Syncing state with server...')
          setHasLiked(data.userHasLiked ?? hasLiked)
          setLikes(data.totalLikes ?? likes)
          return
        }

        throw new Error(data.error || 'Failed to toggle like')
      }

      // Success! Update local state
      console.log(`✅ [CommentLikeButton] ${action} like successful!`)
      console.log(`📊 [CommentLikeButton] New state - hasLiked: ${data.userHasLiked}, likes: ${data.totalLikes}`)

      setHasLiked(data.userHasLiked)
      setLikes(data.totalLikes)

      // Refresh the page to sync all counts
      router.refresh()
    } catch (error: any) {
      console.error('❌ [CommentLikeButton] Error:', error)

      // On error, revert optimistic update if any
      // (Currently we don't do optimistic updates, but this is here for future)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  }

  const paddingClasses = {
    sm: 'px-2 py-1',
    md: 'px-3 py-2',
  }

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className={`
        group
        inline-flex items-center gap-1.5
        ${paddingClasses[size]}
        rounded-md
        transition-all duration-200
        hover:bg-gray-50
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={hasLiked ? 'Unlike comment' : 'Like comment'}
      title={`${likes} ${likes === 1 ? 'like' : 'likes'}`}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Heart Icon - Medium Style (thin lines) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <svg
        className={`${sizeClasses[size]} transition-colors duration-200 ${
          hasLiked
            ? 'text-red-500 fill-current' // Liked: red filled heart
            : 'text-gray-400 group-hover:text-gray-600' // Not liked: gray outline
        }`}
        fill={hasLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Heart icon path */}
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Like Count (only show if > 0) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {likes > 0 && (
        <span
          className={`${textSizeClasses[size]} font-medium transition-colors duration-200 ${
            hasLiked
              ? 'text-gray-700' // Liked: darker text
              : 'text-gray-500 group-hover:text-gray-700' // Not liked: lighter text
          }`}
        >
          {likes}
        </span>
      )}
    </button>
  )
}
