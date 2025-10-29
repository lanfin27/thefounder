'use client'

/**
 * Admin Category Management Page
 * YouTube Industry 카테고리 관리 페이지
 */

import { useState, useEffect } from 'react'
import { CategoryManagementModal } from '@/components/admin/CategoryManagementModal'
import { Plus, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

interface Category {
  code: string
  name: string
  icon: string
  emoji: string
  description: string
  channel_count?: number  // ← API returns channel_count
  avg_views_per_video?: number
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/youtube-industry/categories')
      const result = await response.json()

      if (result.success) {
        setCategories(result.data)
        console.log(`✅ Loaded ${result.data.length} categories`)
      } else {
        throw new Error(result.error || 'Failed to fetch categories')
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    setModalMode('add')
    setSelectedCategory(undefined)
    setIsModalOpen(true)
  }

  const handleEditClick = (category: Category) => {
    setModalMode('edit')
    setSelectedCategory(category)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (category: Category) => {
    const channelCount = category.channel_count || 0

    if (channelCount > 0) {
      if (!confirm(
        `⚠️ 경고\n\n"${category.name}" 카테고리는 현재 ${channelCount}개의 채널이 사용 중입니다.\n\n삭제하면 해당 채널들의 카테고리가 지정되지 않을 수 있습니다.\n\n정말 삭제하시겠습니까?`
      )) {
        return
      }
    } else {
      if (!confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
        return
      }
    }

    try {
      const response = await fetch(`/api/admin/youtube-industry/categories/${category.code}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || '삭제 실패')
        return
      }

      alert('✅ 카테고리가 삭제되었습니다.')
      fetchCategories()
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ 삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🏷️ 카테고리 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            YouTube Industry 카테고리를 추가, 수정, 삭제할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>새 카테고리 추가</span>
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">오류 발생</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* 카테고리 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">카테고리가 없습니다.</p>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>첫 카테고리 추가하기</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    설명
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    채널 수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr
                    key={category.code}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {category.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{category.icon || category.emoji}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate block">
                        {category.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.channel_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(category)}
                          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center gap-1 transition-colors"
                          title="수정"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>수정</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(category)}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-1 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>삭제</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 통계 */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>전체 {categories.length}개 카테고리</span>
              <span>
                총 {categories.reduce((sum, cat) => sum + (cat.channel_count || 0), 0)}개 채널
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 모달 */}
      <CategoryManagementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCategories()
          setIsModalOpen(false)
        }}
        mode={modalMode}
        category={selectedCategory}
      />
    </div>
  )
}
