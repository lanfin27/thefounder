'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createList } from '@/lib/supabase/queries/lists'
import type { CreateListInput } from '@/types/library'

interface CreateListModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateListModal({ isOpen, onClose, onSuccess }: CreateListModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('리스트 이름을 입력해주세요')
      return
    }

    if (name.trim().length > 100) {
      setError('리스트 이름은 100자 이내로 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const input: CreateListInput = {
        name: name.trim(),
        description: description.trim() || undefined
      }

      await createList(input)

      // Reset form
      setName('')
      setDescription('')

      onSuccess()
    } catch (err: any) {
      console.error('Failed to create list:', err)
      setError(err.message || '리스트 생성에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    setName('')
    setDescription('')
    setError('')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              새 리스트 만들기
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Name Input */}
            <div className="mb-4">
              <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 mb-2">
                리스트 이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="list-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 나중에 읽기"
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100"
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                {name.length}/100
              </p>
            </div>

            {/* Description Input */}
            <div className="mb-4">
              <label htmlFor="list-description" className="block text-sm font-medium text-gray-700 mb-2">
                설명 (선택)
              </label>
              <textarea
                id="list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 리스트에 대한 간단한 설명을 입력하세요"
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none disabled:bg-gray-100"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '생성 중...' : '만들기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
