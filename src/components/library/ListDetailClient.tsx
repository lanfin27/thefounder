'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { deleteList, removeFromList } from '@/lib/supabase/queries/lists'
import { useBookmark } from '@/contexts/BookmarkContext'
import EditListModal from '@/components/library/EditListModal'
import PostList from '@/components/sections/PostList'
import type { List, ListItem } from '@/types/library'
import type { BlogPost } from '@/types'

interface ListDetailClientProps {
  initialList: List
  initialItems: ListItem[]
  listId: string
}

// Extend BlogPost to include list item data
interface ListBlogPost extends BlogPost {
  listItem: {
    id: string // list_item id (not post id)
    added_at: string
    note?: string
  }
}

function formatTimeAgo(dateString: string): string {
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

export default function ListDetailClient({
  initialList,
  initialItems,
  listId
}: ListDetailClientProps) {
  const router = useRouter()
  const { reloadLists } = useBookmark()
  const [list, setList] = useState<List>(initialList)
  const [items, setItems] = useState<ListItem[]>(initialItems)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // State for managing individual item menus
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Map list items to BlogPosts
  const posts = useMemo(() => {
    return items
      .filter(item => item.post)
      .map(item => ({
        ...item.post,
        listItem: {
          id: item.id,
          added_at: item.added_at,
          note: item.note
        }
      })) as ListBlogPost[]
  }, [items])

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

  async function handleRemoveItem(postId: string) {
    const confirmed = confirm('이 리스트에서 글을 제거하시겠습니까?')
    if (!confirmed) return

    setRemovingId(postId)
    try {
      await removeFromList(listId, postId)
      await reloadLists()

      // Update local state
      setItems(prev => prev.filter(item => item.post_id !== postId))
      console.log('✅ [ListDetailClient] Item removed')
    } catch (error) {
      console.error('❌ [ListDetailClient] Remove item failed:', error)
      alert('제거하는 중 오류가 발생했습니다.')
    } finally {
      setRemovingId(null)
      setActiveItemMenuId(null)
    }
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
      <PostList<ListBlogPost>
        posts={posts}
        emptyMessage="아직 저장된 글이 없습니다. 글에서 저장 버튼을 눌러 이 리스트에 추가하세요."
        renderCustomFooter={(post) => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <time>
                {formatTimeAgo(post.listItem.added_at)} 저장됨
              </time>

              {post.readingTime && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{post.readingTime}분 읽기</span>
                </>
              )}

              {post.categoryLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-green-600 font-medium">{post.categoryLabel}</span>
                </>
              )}
            </div>

            {/* User Note */}
            {post.listItem.note && (
              <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-sm text-gray-700 italic">
                "{post.listItem.note}"
              </div>
            )}
          </div>
        )}
        renderActions={(post) => (
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault() // Prevent link navigation
                setActiveItemMenuId(activeItemMenuId === post.id ? null : post.id)
              }}
              disabled={removingId === post.id}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {activeItemMenuId === post.id && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveItemMenuId(null)
                  }}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setActiveItemMenuId(null)
                      handleRemoveItem(post.id)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>리스트에서 제거</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      />

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
