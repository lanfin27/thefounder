'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getUserLists, addToList, removeFromList } from '@/lib/supabase/queries/lists';
import type { List } from '@/types/library';

interface BookmarkContextType {
  lists: List[];
  savedPostIds: Set<string>;
  isPostSaved: (postId: string) => boolean;
  getSavedListIds: (postId: string) => string[];
  toggleList: (listId: string, postId: string) => Promise<void>;
  reloadLists: () => Promise<void>;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<List[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load all user lists and extract saved post IDs
  const reloadLists = useCallback(async () => {
    try {
      console.log('📚 [BookmarkContext] Loading lists...');
      setIsLoading(true);

      const userLists = await getUserLists();
      console.log('✅ [BookmarkContext] Loaded', userLists.length, 'lists');

      // Extract all saved post IDs from all lists
      const postIds = new Set<string>();
      userLists.forEach(list => {
        list.list_items?.forEach(item => {
          if (item.post_id) {
            postIds.add(item.post_id);
          }
        });
      });

      console.log('📊 [BookmarkContext] Total saved posts:', postIds.size);

      setLists(userLists);
      setSavedPostIds(postIds);
    } catch (error: any) {
      console.error('❌ [BookmarkContext] Load error:', error);

      // If auth error, clear state but don't redirect
      // Individual components will handle redirect if needed
      if (error.message?.includes('Not authenticated')) {
        console.log('⚠️ [BookmarkContext] Not authenticated, clearing state');
        setLists([]);
        setSavedPostIds(new Set());
      } else {
        setLists([]);
        setSavedPostIds(new Set());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    reloadLists();
  }, [reloadLists]);

  // Check if a post is saved in any list
  const isPostSaved = useCallback((postId: string): boolean => {
    return savedPostIds.has(postId);
  }, [savedPostIds]);

  // Get list IDs that contain this post
  const getSavedListIds = useCallback((postId: string): string[] => {
    return lists
      .filter(list =>
        list.list_items?.some(item => item.post_id === postId)
      )
      .map(list => list.id);
  }, [lists]);

  // Toggle a post in a specific list
  const toggleList = useCallback(async (listId: string, postId: string) => {
    try {
      const isInList = lists
        .find(list => list.id === listId)
        ?.list_items?.some(item => item.post_id === postId);

      if (isInList) {
        console.log('➖ [BookmarkContext] Removing from list:', listId);
        await removeFromList(listId, postId);
      } else {
        console.log('➕ [BookmarkContext] Adding to list:', listId);
        await addToList({
          list_id: listId,
          post_id: postId
        });
      }

      // Reload all lists to sync state across all components
      await reloadLists();

      console.log('✅ [BookmarkContext] Toggle complete, all lists reloaded');
    } catch (error: any) {
      console.error('❌ [BookmarkContext] Toggle error:', error);

      // If auth error, redirect to login
      if (error.message?.includes('Not authenticated')) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        console.log('⚠️ [BookmarkContext] Not authenticated, redirecting to login');
        router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
      }

      throw error;
    }
  }, [lists, reloadLists, router]);

  return (
    <BookmarkContext.Provider
      value={{
        lists,
        savedPostIds,
        isPostSaved,
        getSavedListIds,
        toggleList,
        reloadLists,
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
