'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, TrendingUp, Lightbulb, BarChart3, PenTool, ThumbsUp, MessageCircle, X } from 'lucide-react';

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 CATEGORIES 배열 - DB 값에 맞춰 수정하세요!
// 콘솔에서 "UNIQUE CATEGORIES IN DB" 확인 후 수정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 한글 카테고리 (DB 값과 일치)
const CATEGORIES = [
  { id: 'all', label: '전체', icon: Search },
  { id: '트렌드', label: '트렌드', icon: TrendingUp },
  { id: '인사이트', label: '인사이트', icon: Lightbulb },
  { id: '성공사례', label: '사례', icon: BarChart3 },
  { id: '블로그', label: '블로그', icon: PenTool },
];

// 옵션 1: DB에 영문 단수형으로 저장된 경우
// const CATEGORIES = [
//   { id: 'all', label: '전체', icon: Search },
//   { id: 'trend', label: '트렌드', icon: TrendingUp },
//   { id: 'insight', label: '인사이트', icon: Lightbulb },
//   { id: 'case', label: '사례', icon: BarChart3 },
//   { id: 'blog', label: '블로그', icon: PenTool },
// ];

// 옵션 2: DB에 한글로 저장된 경우
// const CATEGORIES = [
//   { id: 'all', label: '전체', icon: Search },
//   { id: '트렌드', label: '트렌드', icon: TrendingUp },
//   { id: '인사이트', label: '인사이트', icon: Lightbulb },
//   { id: '사례', label: '사례', icon: BarChart3 },
//   { id: '블로그', label: '블로그', icon: PenTool },
// ];

// 옵션 3: DB에 다른 이름으로 저장된 경우 (예: '성공사례')
// const CATEGORIES = [
//   { id: 'all', label: '전체', icon: Search },
//   { id: 'trends', label: '트렌드', icon: TrendingUp },
//   { id: 'insights', label: '인사이트', icon: Lightbulb },
//   { id: '성공사례', label: '사례', icon: BarChart3 },
//   { id: 'blog', label: '블로그', icon: PenTool },
// ];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ✅ 모바일 툴팁 상태
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 모바일 감지
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      console.log('[SearchModal] Category info:', data.categoryInfo);

      // 카테고리 매칭 실패 시 경고
      if (searchCategory !== 'all' && data.categoryInfo?.matched === 0) {
        console.warn('[SearchModal] ⚠️⚠️⚠️ No posts matched category!');
        console.warn('[SearchModal] Requested:', data.categoryInfo.requested);
        console.warn('[SearchModal] Available in DB:', data.categoryInfo.available);
        console.warn('[SearchModal] 💡 Update CATEGORIES array to match DB values!');
      }

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
      setActiveTooltip(null);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  // ✅ 카테고리 클릭 핸들러 (모바일 툴팁)
  const handleCategoryClick = (categoryId: string) => {
    console.log('[SearchModal] Category clicked:', categoryId, 'Mobile:', isMobile);

    setCategory(categoryId);

    // 모바일에서만 툴팁 표시
    if (isMobile) {
      console.log('[SearchModal] Showing tooltip for:', categoryId);
      setActiveTooltip(categoryId);

      setTimeout(() => {
        console.log('[SearchModal] Hiding tooltip');
        setActiveTooltip(null);
      }, 1500);
    }
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
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[80vh] overflow-hidden">

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 헤더: 검색 입력 + 닫기 버튼 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="relative p-3 sm:p-4 border-b">
            {/* 검색 입력 */}
            <div className="relative pr-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600 text-sm sm:text-base"
                autoFocus
              />

              {/* X 버튼: 입력이 있으면 입력 지우기, 없으면 모달 닫기 */}
              <button
                onClick={() => {
                  if (query) {
                    setQuery('');
                  } else {
                    onClose();
                  }
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label={query ? '입력 지우기' : '검색 닫기'}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 카테고리 필터 - 모바일 툴팁 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="px-3 sm:px-4 py-2 border-b bg-gray-50">
            <div className="flex items-center gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = category === cat.id;
                const showTooltip = activeTooltip === cat.id;

                return (
                  <div key={cat.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${isActive
                          ? 'bg-green-50 text-green-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      title={cat.label}
                    >
                      <Icon className="w-4 h-4" />
                      {/* PC: 텍스트 표시 */}
                      <span className="hidden sm:inline">{cat.label}</span>
                    </button>

                    {/* ✅ 모바일 툴팁 */}
                    {showTooltip && (
                      <div className="sm:hidden absolute -bottom-9 left-1/2 transform -translate-x-1/2 z-50">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in-out">
                          {cat.label}
                        </div>
                        {/* 화살표 */}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ❌ 디버그 정보 제거 (또는 개발 모드에서만) */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 디버그 정보는 콘솔에서만 확인 가능 */}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 검색 결과 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(80vh-140px)]">
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
                  <p className="mt-2 text-sm text-gray-500">
                    다른 검색어를 시도해보세요.
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
                <div className="px-3 sm:px-4 py-2 bg-gray-50 border-b">
                  <p className="text-xs text-gray-500">
                    {results.length}개의 결과
                  </p>
                </div>

                <div className="divide-y">
                  {results.map((result) => {
                    const categoryData = CATEGORIES.find(c => c.id === result.category);
                    const CategoryIcon = categoryData?.icon || PenTool;

                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.slug)}
                        className="w-full px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex gap-3">
                          {result.thumbnail_url && (
                            <div className="flex-shrink-0">
                              <img
                                src={result.thumbnail_url}
                                alt={result.title}
                                className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CategoryIcon className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-xs text-gray-500">
                                {categoryData?.label || result.category}
                              </span>
                            </div>

                            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                              {result.title}
                            </h3>

                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500">
                              <span className="hidden sm:inline">
                                {new Date(result.created_at).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {result.claps_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {result.comments_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
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
