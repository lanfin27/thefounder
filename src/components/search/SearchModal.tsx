'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, TrendingUp, Lightbulb, BarChart3, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  thumbnail_url?: string;
  created_at?: string;
  claps_count?: number;
  comments_count?: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '전체', icon: Tag },
  { id: 'trends', label: '트렌드', icon: TrendingUp },
  { id: 'insights', label: '인사이트', icon: Lightbulb },
  { id: 'cases', label: '사례', icon: BarChart3 },
  { id: 'blog', label: '블로그', icon: Tag },
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(query, 500);

  // 검색 실행
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    console.log('🔍 [SearchModal] Searching...', { query: searchQuery, category: searchCategory });
    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: searchCategory,
      });

      const response = await fetch(`/api/search?${params}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('✅ [SearchModal] Results:', data.count, 'Method:', data.method);
      setResults(data.results || []);
    } catch (error) {
      console.error('❌ [SearchModal] Error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    performSearch(debouncedQuery, category);
  }, [debouncedQuery, category, performSearch]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose}>
      <div
        className="absolute top-0 left-0 right-0 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto">

          {/* Search Input */}
          <div className="flex items-center gap-4 p-4 border-b border-gray-200">
            <Search className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="트렌드, 인사이트, 사례, 블로그에서 검색..."
              className="flex-1 text-lg outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto">

            {/* Loading */}
            {isLoading && (
              <div className="p-8 text-center text-gray-500">
                검색 중...
              </div>
            )}

            {/* Category Filters - Show when there's a query */}
            {query && (
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">필터:</span>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            category === cat.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* No Query - Show category navigation */}
            {!query && !isLoading && (
              <div className="p-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  인기 카테고리
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/trend"
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <TrendingUp className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium">트렌드</span>
                  </Link>
                  <Link
                    href="/insight"
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <Lightbulb className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium">인사이트</span>
                  </Link>
                  <Link
                    href="/case"
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium">사례</span>
                  </Link>
                  <Link
                    href="/blog"
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <Tag className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium">블로그</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Results */}
            {query && !isLoading && results.length > 0 && (
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-4">
                  {results.length}개의 결과
                </p>
                <div className="space-y-3">
                  {results.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.slug}`}
                      onClick={onClose}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* 썸네일 */}
                      {post.thumbnail_url && (
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={post.thumbnail_url}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      )}

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        {post.category && (
                          <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded mb-2">
                            {CATEGORIES.find(c => c.id === post.category)?.label || post.category}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mt-1">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {post.excerpt}
                          </p>
                        )}
                        {/* 메타 정보 */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {post.created_at && (
                            <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                          )}
                          {post.claps_count !== undefined && <span>👏 {post.claps_count}</span>}
                          {post.comments_count !== undefined && <span>💬 {post.comments_count}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query && !isLoading && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                "{query}"에 대한 검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔥 Default export 추가 (양쪽 import 방식 모두 지원)
export default SearchModal;
