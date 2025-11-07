'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { updateList } from '@/lib/supabase/queries/lists'
import type { List } from '@/types/library'

interface EditListModalProps {
  list: List
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedList: List) => void
}

export default function EditListModal({ list, isOpen, onClose, onSuccess }: EditListModalProps) {
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      alert('리스트 이름을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const updatedList = await updateList(list.id, {
        name: name.trim(),
        description: description.trim() || undefined
      })

      console.log('✅ [EditListModal] List updated')
      onSuccess(updatedList)
    } catch (error) {
      console.error('❌ [EditListModal] Update failed:', error)
      alert('리스트 수정에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              리스트 수정
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리스트 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 나중에 읽을 글"
                  maxLength={100}
                  required
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
                           disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 리스트에 대한 간단한 설명을 작성하세요"
                  rows={3}
                  maxLength={500}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
                           resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg
                         hover:bg-gray-50 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  '저장하기'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
