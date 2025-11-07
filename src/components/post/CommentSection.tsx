'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CommentForm from './CommentForm'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  post_id: string
  parent_id: string | null
  updated_at?: string
  replies?: Comment[]
  likes?: number
}

// 시간 표시 함수
function getTimeAgo(dateString: string): string {
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

// 작성자 정보 추출
function getAuthorInfo(comment: Comment, currentUser: any): { initial: string, name: string } {
  if (currentUser && comment.user_id === currentUser.id) {
    const email = currentUser.email || ''
    const name = currentUser.user_metadata?.full_name || email.split('@')[0] || '나'
    const initial = name.charAt(0).toUpperCase()
    return { initial, name }
  }

  const userId = comment.user_id.slice(0, 8)
  return {
    initial: 'U',
    name: `사용자 ${userId}`
  }
}

// Individual comment component
function MediumCommentItem({
  comment,
  currentUser,
  onReply,
  onDelete,
  onLike,
  isLiked = false
}: {
  comment: Comment
  currentUser: any
  onReply: (parentId: string) => void
  onDelete: (commentId: string) => void
  onLike: (commentId: string) => void
  isLiked?: boolean
}) {
  const authorInfo = getAuthorInfo(comment, currentUser)
  const isOwnComment = currentUser && comment.user_id === currentUser.id
  const likesCount = comment.likes || 0

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {authorInfo.initial}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Author & Time - Medium Style */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900">
              {authorInfo.name}
            </span>
            <span className="text-xs text-gray-500">
              {getTimeAgo(comment.created_at)}
            </span>
          </div>

          {/* Comment Body - Medium Style */}
          <p className="text-sm text-gray-900 leading-relaxed mb-3" style={{ fontFamily: 'inherit' }}>
            {comment.content}
          </p>

          {/* Action Buttons - Medium Style */}
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs hover:text-gray-900 transition-colors ${
                isLiked ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {/* 답글 버튼 */}
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              답글
            </button>

            {/* 삭제 버튼 (본인 댓글만) */}
            {isOwnComment && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors font-medium"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 mt-4 space-y-4 border-l-2 border-gray-100 pl-4">
          {comment.replies.map((reply) => (
            <MediumCommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main CommentSection component
export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchComments()
  }, [postId])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchComments = async () => {
    try {
      setLoading(true)

      console.log('🔍 [CommentSection] Fetching comments for postId:', postId)

      // Fetch all comments for this specific post
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [CommentSection] Error fetching comments:', error)
        throw error
      }

      console.log('✅ [CommentSection] Fetched', data?.length || 0, 'comments for this post')

      // Extra safety: Filter out any comments without valid post_id
      const validComments = data?.filter(comment =>
        comment.post_id && comment.post_id === postId
      ) || []

      console.log('📊 [CommentSection] Valid comments after filtering:', validComments.length)

      // Convert to comment tree structure
      const commentMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      // First pass: Store all comments in Map
      validComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] })
      })

      // Second pass: Set parent-child relationships
      validComments.forEach((comment) => {
        const commentObj = commentMap.get(comment.id)!
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id)
          if (parent) {
            parent.replies = parent.replies || []
            parent.replies.push(commentObj)
          }
        } else {
          rootComments.push(commentObj)
        }
      })

      console.log('📊 [CommentSection] Root comments:', rootComments.length)
      setComments(rootComments)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async (content: string, parentId: string | null) => {
    if (!user) {
      alert('Please sign in to leave a response.')
      return
    }

    console.log('💬 [CommentSection] Submitting comment for postId:', postId)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_id: parentId
        })
        .select()

      if (error) {
        console.error('❌ [CommentSection] Error submitting comment:', error)
        throw error
      }

      console.log('✅ [CommentSection] Comment created successfully:', data)

      // Refresh comment list
      await fetchComments()

      // Exit reply mode
      setReplyingTo(null)
    } catch (error: any) {
      console.error('Failed to submit comment:', error)
      throw error
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      await fetchComments()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('An error occurred while deleting the response.')
    }
  }

  const handleLike = async (commentId: string) => {
    // TODO: Implement like feature (requires separate likes table)
    console.log('Like:', commentId)
    alert('Like feature coming soon!')
  }

  const handleReply = (parentId: string) => {
    setReplyingTo(replyingTo === parentId ? null : parentId)
  }

  if (loading) {
    return (
      <p className="text-gray-500 text-center text-sm">불러오는 중...</p>
    )
  }

  return (
    <>
      {/* 댓글 헤더 */}
      <h2 className="text-base font-semibold text-gray-900 mb-8">
        댓글 ({comments.length})
      </h2>

      {/* 댓글 작성 폼 */}
      {!replyingTo && (
        <CommentForm
          user={user}
          onSubmit={handleCommentSubmit}
          placeholder="의견을 남겨보세요"
        />
      )}

      {/* 댓글 목록 */}
      <div className="mt-8 space-y-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
              <MediumCommentItem
                comment={comment}
                currentUser={user}
                onReply={handleReply}
                onDelete={handleDelete}
                onLike={handleLike}
              />

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="ml-11 mt-4">
                  <CommentForm
                    user={user}
                    parentId={comment.id}
                    onSubmit={handleCommentSubmit}
                    onCancel={() => setReplyingTo(null)}
                    placeholder={`Reply to ${getAuthorInfo(comment, user).name}...`}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}
