'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

// Native debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface SearchResult {
  id: string
  title: string
  excerpt: string
  slug: string
  category: string
  author: string
  publishedAt: string
  readingTime: number
  thumbnail?: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches] = useState(['스타트업', '투자', '마케팅', '창업', 'MVP'])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Search API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
      } else {
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => performSearch(searchQuery), 300),
    [performSearch]
  )

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  // Save to recent searches and navigate
  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))
    
    // Navigate to post
    router.push(`/posts/${result.slug}`)
    onClose()
  }

  // Handle quick search click
  const handleQuickSearch = (term: string) => {
    setQuery(term)
    performSearch(term)
  }

  if (!isOpen) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Input */}
            <div className="border-b border-gray-200">
              <div className="flex items-center px-6 py-4">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={handleSearchChange}
                  placeholder="콘텐츠 검색..."
                  className="flex-1 text-lg outline-none placeholder-gray-400"
                  autoComplete="off"
                />
                {loading && (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin mr-3" />
                )}
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Search Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Quick Search Suggestions */}
              {!query && (
                <div className="p-6">
                  {recentSearches.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        최근 검색어
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickSearch(term)}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      인기 검색어
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((term, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickSearch(term)}
                          className="px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Search Results */}
              {query && !loading && results.length > 0 && (
                <div className="py-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className="flex items-start gap-4">
                        {result.thumbnail && (
                          <img
                            src={result.thumbnail}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-green-600 transition-colors mb-1">
                            {result.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {result.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{result.category}</span>
                            <span>•</span>
                            <span>{result.author}</span>
                            <span>•</span>
                            <span>{result.readingTime}분 읽기</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No Results */}
              {query && !loading && results.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-gray-600">
                    다른 검색어로 시도해보세요
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd>
                  선택
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd>
                  탐색
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">ESC</kbd>
                  닫기
                </span>
              </div>
              <span>
                총 {results.length}개 결과
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Portal to render modal at root level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}