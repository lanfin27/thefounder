'use client';

import { useEffect } from 'react';
import { useBookmark } from '@/contexts/BookmarkContext';
import BookmarkDropdown from '@/components/shared/BookmarkDropdown';

interface BookmarkButtonProps {
  postId: string;
  postTitle?: string;
}

export default function BookmarkButton({ postId, postTitle }: BookmarkButtonProps) {
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
      console.log('🔍 [BookmarkButton/Library] State check');
      console.log('   postId:', postId);
      console.log('   postTitle:', postTitle);
      console.log('   isSaved:', isSaved);
      console.log('   savedListIds:', savedListIds);
      console.log('   total lists:', lists.length);
    }
  }, [postId, postTitle, lists, isLoading, isSaved, savedListIds]);

  const handleToggleList = async (listId: string) => {
    console.log('🔖 [BookmarkButton/Library] Toggle clicked');
    console.log('   postId:', postId);
    console.log('   listId:', listId);

    try {
      await toggleList(listId, postId);
      console.log('✅ [BookmarkButton/Library] Toggle successful');
    } catch (error) {
      console.error('❌ [BookmarkButton/Library] Toggle failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300">
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-green-600 animate-spin" />
        <span className="text-sm font-medium text-gray-600">로딩 중...</span>
      </div>
    );
  }

  return (
    <BookmarkDropdown
      postId={postId}
      lists={lists}
      savedListIds={savedListIds}
      onToggleList={handleToggleList}
      onReload={reloadLists}
      variant="button"
      isLoading={isLoading}
    />
  );
}
