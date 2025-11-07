'use client'

import React, { useState, useMemo, useEffect, Fragment } from 'react'
import { ChevronDown } from 'lucide-react'
import ReadingHistoryPostCard from './ReadingHistoryPostCard'

type SortOption = 'recent' | 'oldest'

interface ReadingHistoryItem {
  id: string
  post_id: string
  first_read_at: string
  last_read_at: string
  read_count: number
  read_progress: number
  post?: any
}

interface ReadingHistoryClientProps {
  initialItems: ReadingHistoryItem[]
}

export default function ReadingHistoryClient({ initialItems }: ReadingHistoryClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [showDropdown, setShowDropdown] = useState(false)

  // Debug: Log initial items
  useEffect(() => {
    console.log('📊 [ReadingHistoryClient] Initial items:', initialItems.length)
    console.log('📊 [ReadingHistoryClient] Sample data:', initialItems.slice(0, 2).map(i => ({
      id: i.id,
      post_id: i.post_id,
      first_read_at: i.first_read_at,
      last_read_at: i.last_read_at,
      read_count: i.read_count
    })))
  }, [initialItems])

  // Debug: Log when sort changes
  useEffect(() => {
    console.log('🔄 [ReadingHistoryClient] Sort changed to:', sortBy)
  }, [sortBy])

  // Sort items based on selected option
  const sortedItems = useMemo(() => {
    console.log('🔍 [ReadingHistoryClient] Running useMemo sort...')
    console.log('🔍 [ReadingHistoryClient] Current sortBy:', sortBy)
    console.log('🔍 [ReadingHistoryClient] Items to sort:', initialItems.length)

    const sorted = [...initialItems].sort((a, b) => {
      if (sortBy === 'recent') {
        // Most recent first: compare last_read_at DESC
        const dateA = new Date(a.last_read_at).getTime()
        const dateB = new Date(b.last_read_at).getTime()
        return dateB - dateA
      } else {
        // Oldest first: compare last_read_at ASC
        const dateA = new Date(a.last_read_at).getTime()
        const dateB = new Date(b.last_read_at).getTime()
        return dateA - dateB
      }
    })

    console.log('✅ [ReadingHistoryClient] Sorted by', sortBy, ':',
      sorted.map(item => ({
        id: item.post_id,
        last_read: item.last_read_at
      }))
    )

    return sorted
  }, [initialItems, sortBy])

  console.log('📋 [ReadingHistoryClient] Rendering with', sortedItems.length, 'sorted items')

  const sortOptions = [
    { value: 'recent' as SortOption, label: '최근 읽은 순' },
    { value: 'oldest' as SortOption, label: '오래전 읽은 순' }
  ]

  const currentOption = sortOptions.find(opt => opt.value === sortBy)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          읽은 기록
        </h1>
        <p className="text-lg text-gray-600">
          내가 읽은 모든 글들을 확인하세요
        </p>
        {sortedItems.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {sortedItems.length}개의 글을 읽었습니다
          </p>
        )}
      </div>

      {/* Sort Dropdown */}
      {sortedItems.length > 0 && (
        <div className="mb-6 relative">
          <button
            onClick={() => {
              console.log('🔘 [ReadingHistoryClient] Dropdown clicked')
              setShowDropdown(!showDropdown)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {currentOption?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      console.log('✅ [ReadingHistoryClient] Selected:', option.value)
                      setSortBy(option.value)
                      setShowDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      sortBy === option.value
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                    {sortBy === option.value && (
                      <span className="float-right">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Posts List */}
      {sortedItems.length > 0 ? (
        <Fragment key={sortBy}>
          <div className="space-y-6">
            {sortedItems.map((item, index) => {
              const uniqueKey = `${sortBy}-${item.id}-${index}`
              return (
                <div key={uniqueKey}>
                  <ReadingHistoryPostCard item={item} />
                </div>
              )
            })}
          </div>
        </Fragment>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">
            아직 읽은 글이 없습니다
          </p>
          <p className="text-sm text-gray-400">
            글을 읽으면 자동으로 기록됩니다
          </p>
        </div>
      )}
    </div>
  )
}
