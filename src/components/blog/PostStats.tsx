'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ClapButton from './ClapButton'
import { formatCount } from '@/lib/utils/format'

interface PostStatsProps {
  postSlug: string
  initialClaps: number // Changed: initial value for claps
  initialComments: number // Changed: initial value for comments
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  onCommentClick?: () => void
}

export default function PostStats({
  postSlug,
  initialClaps,
  initialComments,
  size = 'md',
  showLabels = false,
  onCommentClick,
}: PostStatsProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Dynamic state management for counts
  const [clapsCount, setClapsCount] = useState(initialClaps)
  const [commentsCount, setCommentsCount] = useState(initialComments)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (error) {
        console.error('Failed to check auth:', error)
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    console.log('📊 [PostStats] Props changed, syncing state:', {
      claps: initialClaps,
      comments: initialComments,
    })
    setClapsCount(initialClaps)
    setCommentsCount(initialComments)
  }, [initialClaps, initialComments])

  const handleCommentClick = () => {
    // 비로그인 사용자는 즉시 로그인 페이지로 리다이렉트
    if (isAuthenticated === false) {
      router.push('/auth/login')
      return
    }

    if (onCommentClick) {
      onCommentClick()
    } else {
      // Default behavior: scroll to #comments section with offset for header
      const commentsSection = document.getElementById('comments')
      if (commentsSection) {
        const headerOffset = 80 // Header height in pixels
        const elementPosition = commentsSection.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        })
      }
    }
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="flex items-center gap-4 py-3 border-t border-b border-gray-100">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Clap Button (Medium 스타일) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ClapButton
        postSlug={postSlug}
        initialClaps={clapsCount}
        size={size}
        showCount={true}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 댓글 아이콘 (Medium 스타일) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        onClick={handleCommentClick}
        className="
          flex items-center gap-2
          px-3 py-2
          rounded-md
          transition-all duration-200
          hover:bg-gray-100
        "
        aria-label="댓글 보기"
        title={`댓글 ${formatCount(commentsCount)}개`}
      >
        {/* 댓글 아이콘 (SVG) */}
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* 댓글 수 */}
        <span className="text-sm font-medium text-gray-900">
          {formatCount(commentsCount)}
        </span>
      </button>
    </div>
  )
}
