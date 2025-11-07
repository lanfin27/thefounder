'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { deleteList } from '@/lib/supabase/queries/lists'
import ListPostCard from '@/components/library/ListPostCard'
import EditListModal from '@/components/library/EditListModal'
import type { List, ListItem } from '@/types/library'

interface ListDetailClientProps {
  initialList: List
  initialItems: ListItem[]
  listId: string
}

export default function ListDetailClient({
  initialList,
  initialItems,
  listId
}: ListDetailClientProps) {
  const router = useRouter()
  const [list, setList] = useState<List>(initialList)
  const [items, setItems] = useState<ListItem[]>(initialItems)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  async function handleDeleteList() {
    const confirmed = confirm(
      `"${list.name}" 리스트를 삭제하시겠습니까?\n저장된 글들은 유지되지만 이 리스트에서 제거됩니다.`
    )

    if (!confirmed) return

    try {
      await deleteList(listId)
      console.log('✅ [ListDetailClient] List deleted')
      router.push('/library/lists')
      router.refresh()
    } catch (error) {
      console.error('❌ [ListDetailClient] Delete failed:', error)
      alert('리스트 삭제에 실패했습니다')
    }
  }

  function handlePostRemoved(removedPostId: string) {
    // Remove post from local state
    setItems(prev => prev.filter(item => item.post?.id !== removedPostId))
    console.log('✅ [ListDetailClient] Post removed from UI')
  }

  function handleListUpdated(updatedList: List) {
    setList(updatedList)
    console.log('✅ [ListDetailClient] List updated in UI')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/library/lists')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>내 리스트</span>
        </button>

        {/* List Info */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {list.name}
            </h1>
            {list.description && (
              <p className="text-lg text-gray-600 mb-4">
                {list.description}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {items.length}개의 글
            </p>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>리스트 수정</span>
                  </button>
                  {!list.is_default && (
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        handleDeleteList()
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>리스트 삭제</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Posts List */}
      {items.length > 0 ? (
        <div className="space-y-6">
          {items.map((item) => (
            <ListPostCard
              key={item.id}
              item={item}
              listId={listId}
              onRemoved={() => handlePostRemoved(item.post?.id || '')}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">
            아직 저장된 글이 없습니다
          </p>
          <p className="text-sm text-gray-400">
            글에서 저장 버튼을 눌러 이 리스트에 추가하세요
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditListModal
          list={list}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updatedList) => {
            setShowEditModal(false)
            handleListUpdated(updatedList)
          }}
        />
      )}
    </div>
  )
}
