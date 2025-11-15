'use client'

import { useEffect, useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, X, Save, Loader2, Search } from 'lucide-react'

interface Topic {
  topic_name: string
  post_count: number
  is_featured: boolean
  display_order?: number
}

interface FeaturedTopic {
  topic_name: string
  display_order: number
}

// Draggable Topic Card
function SortableTopicCard({
  topic,
  index,
  onRemove
}: {
  topic: FeaturedTopic
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
  } = useSortable({ id: topic.topic_name })

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
        <span className="text-ink-900 font-medium">{topic.topic_name}</span>
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

export default function AdminFeaturedTopicsPage() {
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [featuredTopics, setFeaturedTopics] = useState<FeaturedTopic[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/admin/featured-topics')
      if (response.ok) {
        const data = await response.json()
        setAllTopics(data.all_topics || [])
        setFeaturedTopics(
          (data.featured_topics || []).map((f: any) => ({
            topic_name: f.topic_name,
            display_order: f.display_order
          }))
        )
      } else if (response.status === 403) {
        setMessage({ type: 'error', text: 'Admin 권한이 필요합니다.' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '데이터를 불러오는데 실패했습니다.' })
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = featuredTopics.findIndex(t => t.topic_name === active.id)
      const newIndex = featuredTopics.findIndex(t => t.topic_name === over.id)

      const reordered = arrayMove(featuredTopics, oldIndex, newIndex)

      // Update display_order
      const updated = reordered.map((topic, index) => ({
        ...topic,
        display_order: index + 1
      }))

      setFeaturedTopics(updated)
    }
  }

  const addTopic = (topicName: string) => {
    if (featuredTopics.length >= 8) {
      setMessage({ type: 'error', text: '최대 8개까지만 선택할 수 있습니다.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (featuredTopics.some(t => t.topic_name === topicName)) {
      setMessage({ type: 'error', text: '이미 추가된 토픽입니다.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setFeaturedTopics([
      ...featuredTopics,
      { topic_name: topicName, display_order: featuredTopics.length + 1 }
    ])
    setMessage(null)
  }

  const removeTopic = (topicName: string) => {
    const updated = featuredTopics
      .filter(t => t.topic_name !== topicName)
      .map((topic, index) => ({
        ...topic,
        display_order: index + 1
      }))
    setFeaturedTopics(updated)
  }

  const saveFeaturedTopics = async () => {
    if (featuredTopics.length === 0) {
      setMessage({ type: 'error', text: '최소 1개 이상의 토픽을 선택해주세요.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const topics = featuredTopics.map(topic => ({
        name: topic.topic_name,
        order: topic.display_order
      }))

      const response = await fetch('/api/admin/featured-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
        credentials: 'include'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Featured topics가 저장되었습니다!' })
        await fetchTopics()
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

  // Filter topics by search query
  const filteredAllTopics = searchQuery
    ? allTopics.filter(topic =>
        topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTopics

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
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Featured Topics 관리</h1>
        <p className="text-ink-600">
          메인 페이지 오른쪽 사이드바에 표시될 Featured Topics 8개를 선택하고 순서를 조정하세요
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
        {/* Featured Topics (Drag & Drop) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-ink-900">
              Featured Topics ({featuredTopics.length}/8)
            </h2>
            <button
              onClick={saveFeaturedTopics}
              disabled={saving || featuredTopics.length === 0}
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
              items={featuredTopics.map(t => t.topic_name)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[500px] border-2 border-dashed border-divider rounded-lg p-4 bg-ink-50">
                {featuredTopics.length === 0 ? (
                  <div className="text-center py-12 text-ink-400">
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>왼쪽에서 토픽을 선택하세요</p>
                    <p className="text-sm mt-2">드래그하여 순서를 변경할 수 있습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {featuredTopics.map((topic, index) => (
                      <SortableTopicCard
                        key={topic.topic_name}
                        topic={topic}
                        index={index}
                        onRemove={() => removeTopic(topic.topic_name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* All Topics */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-ink-900 mb-3">
              모든 Topics ({allTopics.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="토픽 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto border border-divider rounded-lg p-4 bg-white">
            {filteredAllTopics.length === 0 ? (
              <div className="text-center py-8 text-ink-400">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredAllTopics.map(topic => {
                const isFeatured = featuredTopics.some(f => f.topic_name === topic.topic_name)
                return (
                  <div
                    key={topic.topic_name}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isFeatured ? 'bg-green-50 border-green-200' : 'bg-white border-divider hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex-1">
                      <span className={`font-medium ${isFeatured ? 'text-green-800' : 'text-ink-900'}`}>
                        {topic.topic_name}
                      </span>
                      <span className="text-sm text-ink-500 ml-2">
                        ({topic.post_count}개)
                      </span>
                    </div>
                    {!isFeatured ? (
                      <button
                        onClick={() => addTopic(topic.topic_name)}
                        disabled={featuredTopics.length >= 8}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="추가"
                      >
                        <Plus className="h-3 w-3" />
                        추가
                      </button>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">✓ Featured</span>
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
          <li>• 오른쪽에서 토픽을 검색하고 "추가" 버튼을 클릭하여 Featured Topics에 추가하세요</li>
          <li>• 드래그 아이콘(⋮⋮)을 잡고 움직여서 순서를 변경할 수 있습니다</li>
          <li>• X 버튼을 클릭하여 토픽을 제거할 수 있습니다</li>
          <li>• 최대 8개까지 선택할 수 있습니다</li>
          <li>• 변경사항을 저장하려면 "저장" 버튼을 클릭하세요</li>
          <li>• 저장 후 메인 페이지 오른쪽 사이드바에서 변경사항을 확인할 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}
