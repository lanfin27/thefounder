'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { getUserLists, addToList, removeFromList, getPostLists, createList } from '@/lib/supabase/queries/lists';
import { useRouter } from 'next/navigation';

interface BookmarkButtonProps {
  postId: string;
}

export default function BookmarkButton({ postId }: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [readingListId, setReadingListId] = useState<string | null>(null);
  const router = useRouter();

  // Load bookmark status
  useEffect(() => {
    loadBookmarkStatus();
  }, [postId]);

  async function loadBookmarkStatus() {
    try {
      console.log('🔍 [BookmarkButton] Loading bookmark status for:', postId);
      setIsLoading(true);

      // Get user's lists
      const userLists = await getUserLists();
      console.log('✅ [BookmarkButton] Got', userLists.length, 'lists');

      // Find or create Reading List
      let readingList = userLists.find(list => list.name === 'Reading List');

      if (!readingList) {
        console.log('📝 [BookmarkButton] Creating Reading List...');
        readingList = await createList({
          name: 'Reading List',
          description: '나중에 읽을 글들을 저장하세요'
        });
        console.log('✅ [BookmarkButton] Reading List created:', readingList.id);
      }

      setReadingListId(readingList.id);

      // Check if post is in any list
      const listsWithPost = await getPostLists(postId);
      const saved = listsWithPost.length > 0;

      console.log('📊 [BookmarkButton] Post is in', listsWithPost.length, 'list(s)');
      setIsSaved(saved);
    } catch (error: any) {
      console.error('❌ [BookmarkButton] Load error:', error);

      // If auth error, user is not logged in
      if (error.message?.includes('Not authenticated')) {
        setIsSaved(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation(); // 부모 이벤트 전파 방지

    console.log('🔖 [BookmarkButton] Clicked! Post ID:', postId);

    try {
      setIsLoading(true);

      // Ensure we have a Reading List
      let listId = readingListId;
      if (!listId) {
        console.log('📝 [BookmarkButton] Creating Reading List...');
        const readingList = await createList({
          name: 'Reading List',
          description: '나중에 읽을 글들을 저장하세요'
        });
        listId = readingList.id;
        setReadingListId(listId);
      }

      if (isSaved) {
        console.log('➖ [BookmarkButton] Removing from Reading List...');
        await removeFromList(listId, postId);
        setIsSaved(false);
        console.log('✅ [BookmarkButton] Removed');
      } else {
        console.log('➕ [BookmarkButton] Adding to Reading List...');
        await addToList({
          list_id: listId,
          post_id: postId
        });
        setIsSaved(true);
        console.log('✅ [BookmarkButton] Added');
      }

      console.log('✅ [BookmarkButton] Toggle complete');
    } catch (error: any) {
      console.error('❌ [BookmarkButton] Error:', error);

      // If auth error, redirect to login
      if (error.message?.includes('Not authenticated')) {
        const currentPath = window.location.pathname;
        router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        // Reload status to ensure UI is correct
        await loadBookmarkStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
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
  );
}
