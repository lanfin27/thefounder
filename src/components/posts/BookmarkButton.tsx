'use client';

import { useBookmark } from '@/contexts/BookmarkContext';
import BookmarkDropdown from '@/components/shared/BookmarkDropdown';

interface BookmarkButtonProps {
  postId: string;
}

export default function BookmarkButton({ postId }: BookmarkButtonProps) {
  const {
    lists,
    getSavedListIds,
    toggleList,
    reloadLists,
    isLoading
  } = useBookmark();

  const savedListIds = getSavedListIds(postId);

  const handleToggleList = async (listId: string) => {
    await toggleList(listId, postId);
  };

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
