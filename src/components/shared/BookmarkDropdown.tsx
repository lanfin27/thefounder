'use client';

import { useState, useEffect, useRef } from 'react';
import { Bookmark, Check } from 'lucide-react';
import type { List } from '@/types/library';

interface BookmarkDropdownProps {
  postId: string;
  lists: List[];
  savedListIds: string[];
  onToggleList: (listId: string) => Promise<void>;
  onReload?: () => Promise<void>;
  variant?: 'icon' | 'button';
  isLoading?: boolean;
  error?: string | null;
}

export default function BookmarkDropdown({
  postId,
  lists,
  savedListIds,
  onToggleList,
  onReload,
  variant = 'icon',
  isLoading = false,
  error = null
}: BookmarkDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSaved = savedListIds.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggleList = async (listId: string) => {
    setIsToggling(true);
    try {
      console.log('🔄 [BookmarkDropdown] Toggling list:', listId);
      await onToggleList(listId);

      // Reload lists to ensure UI is in sync
      if (onReload) {
        await onReload();
      }

      console.log('✅ [BookmarkDropdown] List toggled successfully');
    } catch (error) {
      console.error('❌ [BookmarkDropdown] Toggle error:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bookmark Button */}
      {variant === 'button' ? (
        // Large button variant (for post detail page)
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
            isSaved
              ? 'bg-green-50 border-green-600 text-green-600 hover:bg-green-100'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          aria-label="북마크"
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">
            {isSaved ? '저장됨' : '저장'}
          </span>
        </button>
      ) : (
        // Icon variant (for category/latest pages)
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          type="button"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={isSaved ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Bookmark
            className={`w-5 h-5 transition-colors ${
              isSaved
                ? 'fill-green-600 text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              리스트에 저장
            </h3>
          </div>

          {/* List Items */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                로딩 중...
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-red-600">
                {error}
              </div>
            ) : lists.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  아직 리스트가 없습니다
                </p>
                <a
                  href="/library/lists"
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  리스트 만들기
                </a>
              </div>
            ) : (
              <div className="py-2">
                {lists.map((list) => {
                  const isInList = savedListIds.includes(list.id);

                  return (
                    <button
                      key={list.id}
                      onClick={() => handleToggleList(list.id)}
                      disabled={isToggling}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {list.name}
                        </div>
                        {list.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {list.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {list.post_count || 0}개의 글
                        </div>
                      </div>

                      {/* Checkmark */}
                      {isInList && (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && !error && lists.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <a
                href="/library/lists"
                className="block text-sm text-center text-green-600 hover:text-green-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                리스트 관리
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
