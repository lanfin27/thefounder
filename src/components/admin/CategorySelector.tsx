'use client'

/**
 * Category Selector Component
 * 채널 카테고리 선택/변경 컴포넌트
 */

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'

// ✅ Category 타입 정의
interface Category {
  code: string
  name: string
  icon?: string
  emoji?: string
  description?: string
}

interface CategorySelectorProps {
  channelId: string
  currentCategory: string
  categories: Category[]  // ✅ DB 카테고리 Props
  onUpdate?: (newCategory: string) => void
}

export function CategorySelector({
  channelId,
  currentCategory,
  categories,  // ✅ DB 카테고리 받기
  onUpdate,
}: CategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleCategoryChange = async (newCategory: string) => {
    if (newCategory === selectedCategory) return

    setIsUpdating(true)
    setError(null)
    setShowSuccess(false)

    try {
      const response = await fetch(
        `/api/admin/youtube-industry/channels/${channelId}/category`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categoryCode: newCategory }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update category')
      }

      setSelectedCategory(newCategory)
      setShowSuccess(true)

      // 성공 알림 로그
      console.log('✅ Category updated:', result.changes)

      // 부모 컴포넌트에 알림
      if (onUpdate) {
        onUpdate(newCategory)
      }

      // 2초 후 성공 표시 숨기기
      setTimeout(() => setShowSuccess(false), 2000)

    } catch (err) {
      console.error('Category update error:', err)
      setError(err instanceof Error ? err.message : 'Update failed')

      // 실패 시 원래 카테고리로 되돌리기
      setSelectedCategory(currentCategory)

      // 3초 후 에러 메시지 숨기기
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="relative inline-block">
      <select
        value={selectedCategory}
        onChange={(e) => handleCategoryChange(e.target.value)}
        disabled={isUpdating}
        className={`
          pl-3 pr-10 py-1.5 rounded-md border text-sm font-medium
          transition-colors duration-200
          ${isUpdating
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400'
          }
          ${error
            ? 'border-red-500 dark:border-red-400'
            : showSuccess
            ? 'border-green-500 dark:border-green-400'
            : 'border-gray-300 dark:border-gray-600'
          }
          ${showSuccess ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'}
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        `}
      >
        {categories.map((category) => (
          <option key={category.code} value={category.code}>
            {category.emoji || category.icon} {category.name}
          </option>
        ))}
      </select>

      {/* 로딩 인디케이터 */}
      {isUpdating && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />
        </div>
      )}

      {/* 성공 인디케이터 */}
      {showSuccess && !isUpdating && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
    </div>
  )
}
