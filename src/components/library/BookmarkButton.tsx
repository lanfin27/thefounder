'use client'

import { useState, useEffect, useRef } from 'react'
import { Bookmark, Check } from 'lucide-react'
import { getUserLists, addToList, removeFromList, getPostLists, isPostInList } from '@/lib/supabase/queries/lists'
import type { List } from '@/types/library'

interface BookmarkButtonProps {
  postId: string
  postTitle?: string
}

export default function BookmarkButton({ postId, postTitle }: BookmarkButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [savedInLists, setSavedInLists] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load user's lists and check which ones contain this post
  useEffect(() => {
    if (isOpen) {
      loadLists()
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function loadLists() {
    try {
      console.log('🔍 [BookmarkButton] Starting to load data for postId:', postId)
      setIsLoading(true)
      setError(null)

      const [userLists, listsWithPost] = await Promise.all([
        getUserLists(),
        getPostLists(postId)
      ])

      console.log('✅ [BookmarkButton] Fetched', userLists.length, 'lists')
      console.log('✅ [BookmarkButton] Post is in', listsWithPost.length, 'list(s)')

      setLists(userLists)
      setSavedInLists(new Set(listsWithPost.map(list => list.id)))
    } catch (err: any) {
      console.error('❌ [BookmarkButton] Failed to load:', err)
      setError('리스트를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleList(listId: string) {
    try {
      const isInList = savedInLists.has(listId)

      console.log('📝 [BookmarkButton] Post ID being used:', postId)
      console.log(`📝 [BookmarkButton] ${isInList ? 'Removing from' : 'Adding to'} list:`, listId)

      if (isInList) {
        await removeFromList(listId, postId)
        setSavedInLists(prev => {
          const next = new Set(prev)
          next.delete(listId)
          return next
        })
        console.log('✅ [BookmarkButton] Removed from list')
      } else {
        await addToList({
          list_id: listId,
          post_id: postId
        })
        setSavedInLists(prev => new Set([...prev, listId]))
        console.log('✅ [BookmarkButton] Saved with post_id:', postId)
        console.log('✅ [BookmarkButton] Added to list:', listId)
      }
    } catch (err: any) {
      console.error('❌ [BookmarkButton] Toggle failed:', err)
      const errorMessage = err.message || '저장에 실패했습니다'
      setError(errorMessage)
      // Reload lists to ensure consistency
      await loadLists()
    }
  }

  const isSavedAnywhere = savedInLists.size > 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bookmark Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
          isSavedAnywhere
            ? 'bg-green-50 border-green-600 text-green-600 hover:bg-green-100'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
        aria-label="북마크"
      >
        <Bookmark
          className={`w-5 h-5 ${isSavedAnywhere ? 'fill-current' : ''}`}
        />
        <span className="text-sm font-medium">
          {isSavedAnywhere ? '저장됨' : '저장'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              리스트에 저장
            </h3>
          </div>

          {/* List Items */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                로딩 중...
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-red-600">
                {error}
              </div>
            ) : lists.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  아직 리스트가 없습니다
                </p>
                <a
                  href="/library/lists"
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  리스트 만들기
                </a>
              </div>
            ) : (
              <div className="py-2">
                {lists.map((list) => {
                  const isInList = savedInLists.has(list.id)

                  return (
                    <button
                      key={list.id}
                      onClick={() => toggleList(list.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {list.name}
                        </div>
                        {list.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {list.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {list.post_count || 0}개의 글
                        </div>
                      </div>

                      {/* Checkmark */}
                      {isInList && (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && !error && lists.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <a
                href="/library/lists"
                className="block text-sm text-center text-green-600 hover:text-green-700 font-medium"
              >
                리스트 관리
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
