'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface Topic {
  topic_name: string
  post_count: number
}

interface GroupedTopics {
  [key: string]: Topic[]
}

export default function AllTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [grouped, setGrouped] = useState<GroupedTopics>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTopics()
  }, [])

  const fetchAllTopics = async () => {
    try {
      const response = await fetch('/api/topics')
      if (response.ok) {
        const data = await response.json()
        setTopics(data.topics || [])
        setGrouped(data.grouped || {})
      } else {
        console.error('Failed to fetch topics:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter topics by search query
  const filteredTopics = searchQuery
    ? topics.filter(topic =>
        topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topics

  // Re-group filtered topics
  const filteredGrouped = searchQuery
    ? groupTopicsByFirstChar(filteredTopics)
    : grouped

  // Sort group keys (Korean chosung → English → Other)
  const sortedGroups = Object.keys(filteredGrouped).sort((a, b) => {
    const koreanChosungs = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

    const aIndex = koreanChosungs.indexOf(a)
    const bIndex = koreanChosungs.indexOf(b)

    // Both are Korean chosung
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    // Only a is Korean chosung
    if (aIndex !== -1) return -1
    // Only b is Korean chosung
    if (bIndex !== -1) return 1
    // Both are English or other
    return a.localeCompare(b)
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl font-sans">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-ink-900 mb-4">Explore topics</h1>
        <p className="text-lg text-ink-600 mb-6">
          다양한 주제의 {topics.length}개 토픽을 탐색해보세요
        </p>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
          <input
            type="text"
            placeholder="토픽 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary text-sm"
          />
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-ink-500">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedGroups.map(group => (
            <div key={group} id={group}>
              {/* Group Header */}
              <div className="sticky top-0 bg-white py-4 mb-6 border-b border-divider z-10">
                <h2 className="text-2xl font-bold text-ink-800">{group}</h2>
              </div>

              {/* Topic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGrouped[group].map(topic => (
                  <Link
                    key={topic.topic_name}
                    href={`/topics/${encodeURIComponent(topic.topic_name)}`}
                    className="group"
                  >
                    <div className="p-6 border border-divider rounded-lg hover:shadow-lg hover:border-green-primary transition-all bg-white">
                      <h3 className="text-lg font-semibold text-ink-900 mb-2 group-hover:text-green-primary">
                        {topic.topic_name}
                      </h3>
                      <p className="text-sm text-ink-600">
                        {topic.post_count.toLocaleString()}개의 포스트
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation (Side Index) */}
      {!searchQuery && sortedGroups.length > 5 && (
        <div className="fixed right-8 top-1/3 hidden xl:block">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-divider">
            <div className="text-xs font-semibold text-ink-700 mb-2">빠른 이동</div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sortedGroups.map(group => (
                <a
                  key={group}
                  href={`#${group}`}
                  className="block text-sm text-ink-600 hover:text-green-primary hover:font-medium transition-colors"
                >
                  {group}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to group topics by first character
function groupTopicsByFirstChar(topics: Topic[]): GroupedTopics {
  const grouped: GroupedTopics = {}

  topics.forEach(topic => {
    const firstChar = topic.topic_name.charAt(0).toUpperCase()

    // Korean: Group by chosung
    if (/[ㄱ-ㅎ가-힣]/.test(firstChar)) {
      const chosung = getChosung(firstChar)
      if (!grouped[chosung]) grouped[chosung] = []
      grouped[chosung].push(topic)
    }
    // English: Group by letter
    else if (/[A-Z]/.test(firstChar)) {
      if (!grouped[firstChar]) grouped[firstChar] = []
      grouped[firstChar].push(topic)
    }
    // Other: Group by '#'
    else {
      if (!grouped['#']) grouped['#'] = []
      grouped['#'].push(topic)
    }
  })

  return grouped
}

// Extract Korean chosung
function getChosung(char: string): string {
  const chosungList = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ]

  const code = char.charCodeAt(0) - 44032
  if (code < 0 || code > 11171) return '#'

  return chosungList[Math.floor(code / 588)]
}
