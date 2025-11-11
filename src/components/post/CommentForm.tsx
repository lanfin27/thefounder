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
    e.preventDefault()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 [CommentForm] handleSubmit 시작')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Validate content
    const trimmedContent = content.trim()
    console.log('🔍 댓글 내용 검증:', {
      originalLength: content.length,
      trimmedLength: trimmedContent.length,
      isEmpty: !trimmedContent,
      isSubmitting,
      isReply: !!parentId,
      parentId: parentId || null
    })

    if (!trimmedContent) {
      console.warn('⚠️ 빈 댓글 제출 시도 - 제출 취소')
      return
    }

    if (isSubmitting) {
      console.warn('⚠️ 이미 제출 중 - 중복 제출 방지')
      return
    }

    console.log('✅ 검증 완료 - 제출 진행')
    setIsSubmitting(true)

    try {
      console.log('🚀 onSubmit 콜백 호출:', {
        content: trimmedContent,
        contentLength: trimmedContent.length,
        parentId: parentId || null
      })

      await onSubmit(trimmedContent, parentId || null)

      console.log('✅ onSubmit 완료 - 입력 필드 초기화')
      setContent('')

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎉 [CommentForm] 댓글 제출 완료!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('💥 [CommentForm] 댓글 제출 중 오류 발생')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('Error:', error)
      console.error('Error Type:', error?.constructor?.name || 'Unknown')
      console.error('Error Message:', error?.message || 'No message')
      console.error('Stack:', error?.stack)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // More specific error message
      let userMessage = '댓글 제출 중 오류가 발생했습니다.'

      if (error?.message?.includes('Network')) {
        userMessage = '네트워크 연결을 확인해주세요.'
      } else if (error?.message?.includes('timeout')) {
        userMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
      } else if (error?.message) {
        userMessage = `오류: ${error.message}`
      }

      console.error('사용자 메시지:', userMessage)
      alert(userMessage)
    } finally {
      console.log('🔄 isSubmitting 상태를 false로 변경')
      setIsSubmitting(false)
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
