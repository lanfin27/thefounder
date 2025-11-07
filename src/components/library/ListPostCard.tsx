'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Trash2 } from 'lucide-react'
import { removeFromList } from '@/lib/supabase/queries/lists'
import type { ListItem } from '@/types/library'

interface ListPostCardProps {
  item: ListItem
  listId: string
  onRemoved: () => void
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

export default function ListPostCard({ item, listId, onRemoved }: ListPostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Handle missing post data
  if (!item.post) {
    return (
      <div className="border-b border-gray-200 pb-6">
        <p className="text-sm text-gray-500">삭제된 글입니다</p>
      </div>
    )
  }

  const { post } = item

  async function handleRemove() {
    const confirmed = confirm('이 리스트에서 글을 제거하시겠습니까?')
    if (!confirmed) return

    setRemoving(true)
    try {
      await removeFromList(listId, post.id!)
      console.log('✅ [ListPostCard] Removed from list')
      onRemoved()
    } catch (error) {
      console.error('❌ [ListPostCard] Remove failed:', error)
      alert('제거에 실패했습니다')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <article className="border-b border-gray-200 pb-6 relative">
      <div className="flex gap-6">
        {/* Post Content */}
        <Link
          href={`/posts/${post.slug}`}
          className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div>
            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
              {post.title}
            </h3>

            {/* Excerpt */}
            {post.summary && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {post.summary}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <time>
                {formatTimeAgo(item.added_at)} 저장됨
              </time>
              {post.readingTime && (
                <>
                  <span>·</span>
                  <span>{post.readingTime}분 읽기</span>
                </>
              )}
              {post.category && (
                <>
                  <span>·</span>
                  <span className="text-green-600">{post.category}</span>
                </>
              )}
            </div>

            {/* User Note (if exists) */}
            {item.note && (
              <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-sm text-gray-700 italic">
                  "{item.note}"
                </p>
              </div>
            )}
          </div>
        </Link>

        {/* Thumbnail */}
        {post.cover && (
          <Link
            href={`/posts/${post.slug}`}
            className="flex-shrink-0"
          >
            <img
              src={post.cover}
              alt={post.title || ''}
              className="w-32 h-32 object-cover rounded"
            />
          </Link>
        )}

        {/* Menu Button */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={removing}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
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
                    handleRemove()
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
      </div>
    </article>
  )
}
