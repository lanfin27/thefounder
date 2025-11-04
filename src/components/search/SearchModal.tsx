'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, TrendingUp, Lightbulb, BarChart3, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { searchPosts } from '@/lib/search';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  image_url?: string;
  published_at?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 검색 실행
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchPosts(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

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

            {/* No Query */}
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
                      {/* 이미지 */}
                      {post.image_url && (
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={post.image_url}
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
                          <span className="text-xs font-semibold text-gray-500 uppercase">
                            {post.category}
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
