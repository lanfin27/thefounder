'use client'

import React, { useState, useMemo, useEffect, Fragment } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import PostList from '@/components/sections/PostList'
import { BlogPost } from '@/types'

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

// Extend BlogPost to include reading history data for the list
interface HistoryBlogPost extends BlogPost {
  history: {
    last_read_at: string
    first_read_at: string
    read_count: number
  }
}

export default function ReadingHistoryClient({ initialItems }: ReadingHistoryClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [showDropdown, setShowDropdown] = useState(false)

  // Sort items based on selected option
  const sortedItems = useMemo(() => {
    return [...initialItems].sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.last_read_at).getTime()
        const dateB = new Date(b.last_read_at).getTime()
        return dateB - dateA
      } else {
        const dateA = new Date(a.last_read_at).getTime()
        const dateB = new Date(b.last_read_at).getTime()
        return dateA - dateB
      }
    })
  }, [initialItems, sortBy])

  // Map history items to BlogPosts
  const posts = useMemo(() => {
    return sortedItems
      .filter(item => item.post) // Filter out items with missing posts
      .map(item => ({
        ...item.post,
        history: {
          last_read_at: item.last_read_at,
          first_read_at: item.first_read_at,
          read_count: item.read_count
        }
      })) as HistoryBlogPost[]
  }, [sortedItems])

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
        {posts.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {posts.length}개의 글을 읽었습니다
          </p>
        )}
      </div>

      {/* Sort Dropdown */}
      {posts.length > 0 && (
        <div className="mb-6 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {currentOption?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setShowDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === option.value
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
      <PostList<HistoryBlogPost>
        posts={posts}
        emptyMessage="아직 읽은 글이 없습니다. 글을 읽으면 자동으로 기록됩니다."
        renderCustomFooter={(post) => (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            {/* Last Read Time */}
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <time>
                {formatDistanceToNow(new Date(post.history.last_read_at), {
                  addSuffix: true,
                  locale: ko
                })} 읽음
              </time>
            </div>

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

            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="text-xs text-gray-400">
              처음 읽음: {new Date(post.history.first_read_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
        )}
      />
    </div>
  )
}
