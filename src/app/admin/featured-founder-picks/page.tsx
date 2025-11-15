'use client'

import { useEffect, useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, X, Save, Loader2, Search } from 'lucide-react'

interface Post {
  id: string
  title: string
  slug: string
  category: string
  reading_time: number
  summary?: string
  cover?: string
  author?: string
  published_date: string
  claps_count?: number
  comments_count?: number
  is_featured?: boolean
  display_order?: number
}

interface FeaturedPick {
  post_id: string
  display_order: number
  title: string
}

// Draggable Post Card
function SortablePostCard({
  pick,
  index,
  onRemove
}: {
  pick: FeaturedPick
  index: number
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: pick.post_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border border-divider rounded-lg shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-ink-100 rounded"
          type="button"
        >
          <GripVertical className="h-5 w-5 text-ink-400" />
        </button>
        <span className="font-medium text-ink-700 min-w-[24px]">
          {index + 1}.
        </span>
        <span className="text-ink-900 font-medium line-clamp-1">{pick.title}</span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
        title="제거"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function AdminFeaturedFounderPicksPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [featuredPicks, setFeaturedPicks] = useState<FeaturedPick[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/featured-founder-picks')
      if (response.ok) {
        const data = await response.json()
        setAllPosts(data.all_posts || [])

        // Convert featured picks to include title
        const picks = (data.featured_picks || []).map((f: any) => {
          const post = (data.all_posts || []).find((p: Post) => p.id === f.post_id)
          return {
            post_id: f.post_id,
            display_order: f.display_order,
            title: post?.title || 'Unknown Post'
          }
        })
        setFeaturedPicks(picks)
      } else if (response.status === 403) {
        setMessage({ type: 'error', text: 'Admin 권한이 필요합니다.' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '데이터를 불러오는데 실패했습니다.' })
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = featuredPicks.findIndex(p => p.post_id === active.id)
      const newIndex = featuredPicks.findIndex(p => p.post_id === over.id)

      const reordered = arrayMove(featuredPicks, oldIndex, newIndex)

      // Update display_order
      const updated = reordered.map((pick, index) => ({
        ...pick,
        display_order: index + 1
      }))

      setFeaturedPicks(updated)
    }
  }

  const addPost = (post: Post) => {
    if (featuredPicks.length >= 3) {
      setMessage({ type: 'error', text: '최대 3개까지만 선택할 수 있습니다.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (featuredPicks.some(p => p.post_id === post.id)) {
      setMessage({ type: 'error', text: '이미 추가된 포스트입니다.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setFeaturedPicks([
      ...featuredPicks,
      {
        post_id: post.id,
        display_order: featuredPicks.length + 1,
        title: post.title
      }
    ])
    setMessage(null)
  }

  const removePost = (postId: string) => {
    const updated = featuredPicks
      .filter(p => p.post_id !== postId)
      .map((pick, index) => ({
        ...pick,
        display_order: index + 1
      }))
    setFeaturedPicks(updated)
  }

  const saveFeaturedPicks = async () => {
    if (featuredPicks.length === 0) {
      setMessage({ type: 'error', text: '최소 1개 이상의 포스트를 선택해주세요.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const picks = featuredPicks.map(pick => ({
        post_id: pick.post_id,
        order: pick.display_order
      }))

      const response = await fetch('/api/admin/featured-founder-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks }),
        credentials: 'include'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Founder Picks가 저장되었습니다!' })
        await fetchPosts()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: `❌ 저장 실패: ${data.error}` })
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: '❌ 저장 중 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // Filter posts by search query
  const filteredAllPosts = searchQuery
    ? allPosts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPosts

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Founder Picks 관리</h1>
        <p className="text-ink-600">
          메인 페이지 오른쪽 사이드바에 표시될 Founder Picks 3개를 선택하고 순서를 조정하세요
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Featured Picks (Drag & Drop) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-ink-900">
              Founder Picks ({featuredPicks.length}/3)
            </h2>
            <button
              onClick={saveFeaturedPicks}
              disabled={saving || featuredPicks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-primary text-white rounded-lg text-sm font-medium hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  저장
                </>
              )}
            </button>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={featuredPicks.map(p => p.post_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[500px] border-2 border-dashed border-divider rounded-lg p-4 bg-ink-50">
                {featuredPicks.length === 0 ? (
                  <div className="text-center py-12 text-ink-400">
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>오른쪽에서 포스트를 선택하세요</p>
                    <p className="text-sm mt-2">드래그하여 순서를 변경할 수 있습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {featuredPicks.map((pick, index) => (
                      <SortablePostCard
                        key={pick.post_id}
                        pick={pick}
                        index={index}
                        onRemove={() => removePost(pick.post_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* All Posts */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-ink-900 mb-3">
              모든 Posts ({allPosts.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="포스트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto border border-divider rounded-lg p-4 bg-white">
            {filteredAllPosts.length === 0 ? (
              <div className="text-center py-8 text-ink-400">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredAllPosts.map(post => {
                const isFeatured = featuredPicks.some(f => f.post_id === post.id)
                return (
                  <div
                    key={post.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isFeatured ? 'bg-green-50 border-green-200' : 'bg-white border-divider hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium line-clamp-1 ${isFeatured ? 'text-green-800' : 'text-ink-900'}`}>
                          {post.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-500">
                        <span className="px-2 py-0.5 bg-ink-100 rounded">
                          {post.category}
                        </span>
                        <span>{post.reading_time}분</span>
                        <span>·</span>
                        <span>
                          {new Date(post.published_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    {!isFeatured ? (
                      <button
                        onClick={() => addPost(post)}
                        disabled={featuredPicks.length >= 3}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                        title="추가"
                      >
                        <Plus className="h-3 w-3" />
                        추가
                      </button>
                    ) : (
                      <span className="text-sm text-green-600 font-medium ml-2 flex-shrink-0">✓ Featured</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 오른쪽에서 포스트를 검색하고 "추가" 버튼을 클릭하여 Founder Picks에 추가하세요</li>
          <li>• 드래그 아이콘(⋮⋮)을 잡고 움직여서 순서를 변경할 수 있습니다</li>
          <li>• X 버튼을 클릭하여 포스트를 제거할 수 있습니다</li>
          <li>• 최대 3개까지 선택할 수 있습니다</li>
          <li>• 변경사항을 저장하려면 "저장" 버튼을 클릭하세요</li>
          <li>• 저장 후 메인 페이지 오른쪽 사이드바에서 변경사항을 확인할 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}
