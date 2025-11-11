'use client'

import { useState } from 'react'

interface CommentFormProps {
  user: any
  parentId?: string | null
  onSubmit: (content: string, parentId: string | null) => Promise<void>
  onCancel?: () => void
  placeholder?: string
}

export default function CommentForm({
  user,
  parentId,
  onSubmit,
  onCancel,
  placeholder
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[CommentForm] 🎯 Form submit triggered')
    console.log('[CommentForm] 📝 content:', content)
    console.log('[CommentForm] 📝 content.trim():', content.trim())
    console.log('[CommentForm] 📝 parentId:', parentId)
    console.log('[CommentForm] 📝 isSubmitting:', isSubmitting)
    console.log('[CommentForm] 📝 user:', user?.id)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    e.preventDefault()

    if (!content.trim()) {
      console.warn('[CommentForm] ⚠️ Empty content, ignoring submit')
      return
    }

    if (isSubmitting) {
      console.warn('[CommentForm] ⚠️ Already submitting, ignoring duplicate submit')
      return
    }

    console.log('[CommentForm] ⏳ Setting isSubmitting to TRUE')
    setIsSubmitting(true)

    try {
      console.log('[CommentForm] 📤 Calling parent onSubmit handler...')
      await onSubmit(content.trim(), parentId || null)
      console.log('[CommentForm] ✅ onSubmit completed successfully')

      console.log('[CommentForm] 🧹 Clearing content field')
      setContent('')
      console.log('[CommentForm] ✅ Content cleared')
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('[CommentForm] ❌ Error in handleSubmit:')
      console.error('[CommentForm] ❌ Error object:', error)
      console.error('[CommentForm] ❌ Error type:', typeof error)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      alert('An error occurred while submitting your response.')
    } finally {
      console.log('[CommentForm] 🔓 Setting isSubmitting to FALSE')
      setIsSubmitting(false)
      console.log('[CommentForm] ✅ Form submission cycle complete')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 py-6 border-t border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <p className="text-gray-500 text-sm">
          댓글을 남기려면 로그인이 필요합니다.
        </p>
      </div>
    )
  }

  // 이메일 첫 글자 추출
  const initial = user.email?.charAt(0)?.toUpperCase() || 'U'

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex gap-3">
        {/* 프로필 아바타 */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {initial}
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || "의견을 남겨보세요"}
            className="w-full px-0 py-2 text-sm text-gray-900 placeholder-gray-400 border-0 focus:outline-none focus:ring-0 resize-none min-h-[80px]"
            disabled={isSubmitting}
            style={{ fontFamily: 'inherit' }}
          />

          {/* 버튼 영역 */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors"
              >
                {isSubmitting ? '게시 중...' : parentId ? '답글 작성' : '게시'}
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
