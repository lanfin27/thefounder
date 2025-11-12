'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category: string;
  thumbnail_url?: string;
  created_at: string;
  claps_count: number;
  comments_count: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '전체', icon: '🔍' },
  { id: 'trends', label: '트렌드', icon: '📈' },
  { id: 'insights', label: '인사이트', icon: '💡' },
  { id: 'cases', label: '사례', icon: '📊' },
  { id: 'blog', label: '블로그', icon: '📝' },
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 검색 실행
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const performSearch = useCallback(async (searchQuery: string, searchCategory: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[SearchModal] 🔍 Searching...');
    console.log('[SearchModal] Query:', searchQuery);
    console.log('[SearchModal] Category:', searchCategory);

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

      console.log('[SearchModal] ✅ Results:', data.count);
      console.log('[SearchModal] Method:', data.method);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResults(data.results || []);
    } catch (error) {
      console.error('[SearchModal] ❌ Error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, category);
  }, [debouncedQuery, category, performSearch]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setCategory('all');
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleResultClick = (slug: string) => {
    router.push(`/posts/${slug}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 검색 입력 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600 text-base"
                autoFocus
              />

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 카테고리 필터 - 사이드바 스타일 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    category === cat.id
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 검색 결과 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-4 text-sm text-gray-600">검색 중...</p>
                </div>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-lg text-gray-600">
                    '{query}'에 대한 검색 결과가 없습니다.
                  </p>
                </div>
              </div>
            ) : !hasSearched ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm text-gray-600">
                    검색어를 입력해주세요
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* 결과 개수 */}
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <p className="text-xs text-gray-500">
                    {results.length}개의 결과
                  </p>
                </div>

                {/* 검색 결과 목록 */}
                <div className="divide-y">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result.slug)}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex gap-3">
                        {/* 썸네일 */}
                        {result.thumbnail_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={result.thumbnail_url}
                              alt={result.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          </div>
                        )}

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          {/* 카테고리 */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">
                              {CATEGORIES.find((c) => c.id === result.category)?.icon}
                            </span>
                            <span className="text-xs text-gray-500">
                              {CATEGORIES.find((c) => c.id === result.category)?.label}
                            </span>
                          </div>

                          {/* 제목 */}
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                            {result.title}
                          </h3>

                          {/* 메타 정보 */}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {new Date(result.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            <span>👏 {result.claps_count || 0}</span>
                            <span>💬 {result.comments_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// 🔥 Default export 추가 (양쪽 import 방식 모두 지원)
export default SearchModal;
