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
      {/* 댓글 아이콘 (Medium 스타일 - 얇은 선) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        onClick={handleCommentClick}
        className="
          group
          flex items-center gap-2
          px-3 py-2
          rounded-md
          transition-all duration-200
          hover:bg-gray-50
        "
        aria-label="댓글 보기"
        title={`댓글 ${formatCount(commentsCount)}개`}
      >
        {/* 댓글 아이콘 - 얇은 선 스타일 */}
        <svg
          className="w-6 h-6 text-gray-500 group-hover:text-gray-700 transition-colors duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 채팅 버블 아이콘 */}
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* 댓글 수 */}
        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
          {formatCount(commentsCount)}
        </span>
      </button>
    </div>
  )
}
