'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ClapButton from './ClapButton'

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
    <div className="flex items-center gap-6">
      {/* Clap Button */}
      <div className="flex items-center gap-2">
        <ClapButton
          postSlug={postSlug}
          initialClaps={clapsCount}
          size={size}
          showCount={!showLabels}
        />
        {showLabels && (
          <span className={`text-gray-700 font-medium ${textSizeClasses[size]}`}>
            박수 {clapsCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Comments Count */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCommentClick}
          className={`
            ${sizeClasses[size]}
            flex items-center justify-center
            rounded-full
            border border-gray-300
            hover:border-gray-500
            hover:bg-gray-50
            transition-all duration-200
            group
          `}
          aria-label="댓글 보기"
          title={`${commentsCount}개의 댓글`}
        >
          <span
            className={`${iconSizeClasses[size]} transition-transform group-hover:scale-110`}
          >
            💬
          </span>
        </button>
        {!showLabels && (
          <span
            className={`text-gray-600 font-medium min-w-[30px] ${textSizeClasses[size]}`}
          >
            {commentsCount.toLocaleString()}
          </span>
        )}
        {showLabels && (
          <span className={`text-gray-700 font-medium ${textSizeClasses[size]}`}>
            댓글 {commentsCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
