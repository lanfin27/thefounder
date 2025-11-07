'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteList } from '@/lib/supabase/queries/lists'
import type { List } from '@/types/library'

interface ListCardProps {
  list: List
  onClick: () => void
  onRefresh?: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
  return `${Math.floor(diffDays / 365)}년 전`
}

export default function ListCard({ list, onClick, onRefresh }: ListCardProps) {
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation() // Prevent card click

    if (!confirm(`"${list.name}" 리스트를 삭제하시겠습니까?\n리스트 안의 글들은 삭제되지 않습니다.`)) {
      return
    }

    try {
      await deleteList(list.id)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete list:', error)
      alert('리스트 삭제에 실패했습니다.')
    }
  }

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group relative"
    >
      {/* Cover Image or Gradient */}
      {list.cover_image ? (
        <img
          src={list.cover_image}
          alt={list.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100" />
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900 flex-1">
            {list.name}
          </h3>

          {/* Delete Button */}
          {!list.is_default && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-full ml-2"
              aria-label="리스트 삭제"
            >
              <Trash2Icon className="w-4 h-4 text-gray-500 hover:text-red-600" />
            </button>
          )}
        </div>

        {list.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {list.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{list.post_count || 0}개의 글</span>
          <span>{formatDate(list.updated_at)}</span>
        </div>

        {list.is_default && (
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
              기본 리스트
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
