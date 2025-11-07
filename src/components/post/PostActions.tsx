'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { createClient } from '@/lib/supabase/client'
import {
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid'

interface PostActionsProps {
  postId: string
  postTitle: string
  variant?: 'vertical' | 'horizontal'
}

export default function PostActions({ postId, postTitle, variant = 'vertical' }: PostActionsProps) {
  const { user } = useUser()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // 초기 데이터 로드
  useEffect(() => {
    loadPostActions()
  }, [postId, user])

  const loadPostActions = async () => {
    try {
      // 좋아요 수 조회
      const { count: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (!likesError) {
        setLikeCount(likes || 0)
      }

      // 댓글 수 조회
      const { count: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (!commentsError) {
        setCommentCount(comments || 0)
      }

      // 사용자의 좋아요/저장 상태 확인
      if (user) {
        const { data: like } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle()

        setIsLiked(!!like)

        const { data: save } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle()

        setIsSaved(!!save)
      }
    } catch (error) {
      console.error('Error loading post actions:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setIsLoading(true)
    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error

        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })

        if (error) throw error

        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      alert('좋아요 처리에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setIsLoading(true)
    try {
      if (isSaved) {
        // 저장 취소
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error

        setIsSaved(false)
      } else {
        // 저장
        const { error } = await supabase
          .from('saved_posts')
          .insert({
            post_id: postId,
            user_id: user.id,
            post_title: postTitle
          })

        if (error) throw error

        setIsSaved(true)
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      alert('저장 처리에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url: window.location.href
        })
      } catch (error) {
        console.log('Share canceled')
      }
    } else {
      // Fallback: 클립보드에 복사
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('링크가 클립보드에 복사되었습니다!')
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const scrollToComments = () => {
    const commentsSection = document.getElementById('comments-section')
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (variant === 'horizontal') {
    return (
      <div className="flex items-center gap-6">
        {/* 좋아요 */}
        <button
          onClick={handleLike}
          disabled={isLoading}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
          title="좋아요"
        >
          {isLiked ? (
            <HeartIconSolid className="w-6 h-6 text-red-600" />
          ) : (
            <HeartIcon className="w-6 h-6" />
          )}
          <span className="font-medium">{likeCount}</span>
        </button>

        {/* 댓글 */}
        <button
          onClick={scrollToComments}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          title="댓글"
        >
          <ChatBubbleLeftIcon className="w-6 h-6" />
          <span className="font-medium">{commentCount}</span>
        </button>

        {/* 저장 */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors disabled:opacity-50"
          title="저장"
        >
          {isSaved ? (
            <BookmarkIconSolid className="w-6 h-6 text-green-600" />
          ) : (
            <BookmarkIcon className="w-6 h-6" />
          )}
        </button>

        {/* 공유 */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors ml-auto"
          title="공유"
        >
          <ShareIcon className="w-6 h-6" />
        </button>
      </div>
    )
  }

  // Vertical variant (Medium 스타일 - 왼쪽 고정 바)
  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 bg-white rounded-full shadow-lg p-3 z-10">
      {/* 좋아요 */}
      <button
        onClick={handleLike}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50 group"
        title="좋아요"
      >
        {isLiked ? (
          <HeartIconSolid className="w-7 h-7 text-red-600" />
        ) : (
          <HeartIcon className="w-7 h-7 group-hover:scale-110 transition-transform" />
        )}
        <span className="text-xs font-medium">{likeCount}</span>
      </button>

      {/* 댓글 */}
      <button
        onClick={scrollToComments}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors group"
        title="댓글"
      >
        <ChatBubbleLeftIcon className="w-7 h-7 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium">{commentCount}</span>
      </button>

      {/* 저장 */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-green-600 transition-colors disabled:opacity-50 group"
        title="저장"
      >
        {isSaved ? (
          <BookmarkIconSolid className="w-7 h-7 text-green-600" />
        ) : (
          <BookmarkIcon className="w-7 h-7 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* 공유 */}
      <button
        onClick={handleShare}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors group"
        title="공유"
      >
        <ShareIcon className="w-7 h-7 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  )
}
