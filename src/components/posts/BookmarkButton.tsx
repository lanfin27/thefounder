'use client';

import { Bookmark } from 'lucide-react';
import { useBookmark } from '@/contexts/BookmarkContext';

interface BookmarkButtonProps {
  postId: string;
}

export default function BookmarkButton({ postId }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, isLoading } = useBookmark();
  const bookmarked = isBookmarked(postId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation(); // 부모 이벤트 전파 방지

    console.log('🔖 [BookmarkButton] Clicked! Post ID:', postId);

    await toggleBookmark(postId);

    console.log('✅ [BookmarkButton] Toggle complete');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark
        className={`w-5 h-5 transition-colors ${
          bookmarked
            ? 'fill-green-600 text-green-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      />
    </button>
  );
}
