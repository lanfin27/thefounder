'use client';

import { useEffect } from 'react';
import { useBookmark } from '@/contexts/BookmarkContext';
import BookmarkDropdown from '@/components/shared/BookmarkDropdown';

interface BookmarkButtonProps {
  postId: string;
}

export default function BookmarkButton({ postId }: BookmarkButtonProps) {
  const {
    lists,
    isPostSaved,
    getSavedListIds,
    toggleList,
    reloadLists,
    isLoading
  } = useBookmark();

  const savedListIds = getSavedListIds(postId);
  const isSaved = isPostSaved(postId);

  // Debug: Log state when component mounts or updates
  useEffect(() => {
    if (!isLoading && postId) {
      console.log('🔍 [BookmarkButton] State check');
      console.log('   postId:', postId);
      console.log('   isSaved:', isSaved);
      console.log('   savedListIds:', savedListIds);
      console.log('   total lists:', lists.length);

      lists.forEach(list => {
        const hasPost = list.list_items?.some((item: any) => item.post_id === postId);
        console.log(`   ${list.name}: ${hasPost ? 'HAS' : 'NO'} post`);
      });
    }
  }, [postId, lists, isLoading, isSaved, savedListIds]);

  const handleToggleList = async (listId: string) => {
    console.log('🔖 [BookmarkButton] Toggle clicked');
    console.log('   postId:', postId);
    console.log('   listId:', listId);

    try {
      await toggleList(listId, postId);
      console.log('✅ [BookmarkButton] Toggle successful');
    } catch (error) {
      console.error('❌ [BookmarkButton] Toggle failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-green-600 animate-spin" />
    );
  }

  return (
    <BookmarkDropdown
      postId={postId}
      lists={lists}
      savedListIds={savedListIds}
      onToggleList={handleToggleList}
      onReload={reloadLists}
      variant="icon"
      isLoading={isLoading}
    />
  );
}
