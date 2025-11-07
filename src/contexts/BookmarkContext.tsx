'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BookmarkContextType {
  bookmarks: Set<string>;
  toggleBookmark: (postId: string) => Promise<void>;
  isBookmarked: (postId: string) => boolean;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // 북마크 로드
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setBookmarks(new Set());
        setIsLoading(false);
        return;
      }

      // Supabase에서 북마크 가져오기
      const { data, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading bookmarks:', error);
        setBookmarks(new Set());
      } else {
        const bookmarkIds = new Set(data?.map(b => b.post_id) || []);
        setBookmarks(bookmarkIds);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      setBookmarks(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 미로그인 시 로그인 페이지로 리다이렉트
      if (!user) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }

      const isCurrentlyBookmarked = bookmarks.has(postId);

      if (isCurrentlyBookmarked) {
        // 북마크 해제
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;

        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        // 북마크 추가
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            post_id: postId,
          });

        if (error) throw error;

        setBookmarks(prev => new Set([...prev, postId]));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      alert('북마크 처리 중 오류가 발생했습니다.');
    }
  };

  const isBookmarked = (postId: string) => bookmarks.has(postId);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        toggleBookmark,
        isBookmarked,
        isLoading,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmark() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmark must be used within BookmarkProvider');
  }
  return context;
}
