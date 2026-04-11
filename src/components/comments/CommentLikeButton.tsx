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

    // 🆕 Optimistic update — flip immediately so the user gets instant
    // feedback. On failure we roll back below.
    const previousHasLiked = hasLiked
    const previousLikes = likes
    const nextHasLiked = !previousHasLiked
    const nextLikes = previousLikes + (nextHasLiked ? 1 : -1)

    setHasLiked(nextHasLiked)
    setLikes(Math.max(0, nextLikes))
    setIsLoading(true)

    const method = previousHasLiked ? 'DELETE' : 'POST'
    console.log(
      `🔄 [CommentLikeButton] ${method} /api/comments/${commentId}/like (optimistic: ${previousHasLiked}→${nextHasLiked})`,
    )

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        // non-JSON response; fall through with empty data
      }
      console.log(`📥 [CommentLikeButton] ${response.status}`, data)

      // 401: user isn't signed in. Show a visible message BEFORE redirecting
      // so they understand what just happened instead of seeing the page
      // silently swap out.
      if (response.status === 401) {
        setHasLiked(previousHasLiked)
        setLikes(previousLikes)
        if (typeof window !== 'undefined') {
          window.alert('좋아요를 누르려면 로그인이 필요합니다.')
        }
        router.push('/auth/login')
        return
      }

      // "Already liked" / "No like to remove" — the server state is the
      // source of truth, sync to it.
      if (!response.ok) {
        if (data?.alreadyLiked || data?.message === 'No like to remove') {
          console.log('🔄 [CommentLikeButton] Server state drift, syncing…')
          setHasLiked(data.userHasLiked ?? previousHasLiked)
          setLikes(data.totalLikes ?? previousLikes)
          return
        }
        throw new Error(data?.error || `HTTP ${response.status}`)
      }

      // Success — trust the server's canonical count over our optimistic
      // guess.
      if (typeof data?.totalLikes === 'number') setLikes(data.totalLikes)
      if (typeof data?.userHasLiked === 'boolean') setHasLiked(data.userHasLiked)

      // NOTE: we intentionally do NOT call router.refresh() here. On an
      // ISR/dynamic post page it can trigger a full server re-render cycle
      // which cascades back stale CommentSection state — and local state
      // already holds the correct count. See perf commit 7bfa433.
    } catch (error: any) {
      // Roll back optimistic update on failure
      console.error('❌ [CommentLikeButton] Failed:', error)
      setHasLiked(previousHasLiked)
      setLikes(previousLikes)
      if (typeof window !== 'undefined') {
        window.alert(
          `좋아요 처리에 실패했습니다: ${error?.message || '알 수 없는 오류'}`,
        )
      }
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
