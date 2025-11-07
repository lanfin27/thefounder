'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { getUserLists } from '@/lib/supabase/queries/lists'
import ListCard from '@/components/library/ListCard'
import CreateListModal from '@/components/library/CreateListModal'
import type { List } from '@/types/library'

export default function ListsPage() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    try {
      setLoading(true)
      const data = await getUserLists()
      setLists(data)
    } catch (error) {
      console.error('Failed to load lists:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New List Card */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8
                     hover:border-green-500 hover:bg-green-50 transition-all
                     flex flex-col items-center justify-center min-h-[240px]
                     group cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-green-100
                          flex items-center justify-center mb-4 transition-colors">
            <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <span className="text-lg font-medium text-gray-700 group-hover:text-green-700 transition-colors">
            새 리스트 만들기
          </span>
          <span className="text-sm text-gray-500 mt-2">
            관심있는 글을 모아보세요
          </span>
        </button>

        {/* Existing Lists */}
        {lists.map(list => (
          <ListCard
            key={list.id}
            list={list}
            onClick={() => router.push(`/library/lists/${list.id}`)}
            onRefresh={loadLists}
          />
        ))}
      </div>

      {lists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            아직 생성된 리스트가 없습니다.
          </p>
          <p className="text-sm text-gray-400">
            첫 리스트를 만들어 글을 정리해보세요!
          </p>
        </div>
      )}

      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadLists()
        }}
      />
    </>
  )
}
