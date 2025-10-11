import Link from 'next/link'
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface BookmarkItem {
  id: string
  post_id: string
  posts: {
    id: string
    title: string
    slug: string
    category: string
    author: string
    summary: string
    cover?: string
    is_premium?: boolean
  }
  created_at: string
}

interface BookmarksListProps {
  bookmarks: BookmarkItem[]
  onRemove?: (bookmarkId: string) => void
}

export default function BookmarksList({ bookmarks, onRemove }: BookmarksListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <BookmarkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">북마크한 글이 없습니다.</p>
        <p className="text-sm text-gray-400">
          관심 있는 글을 북마크하고 나중에 읽어보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex gap-4">
            {bookmark.posts.cover && (
              <Link
                href={`/posts/${bookmark.posts.slug}`}
                className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={bookmark.posts.cover}
                  alt={bookmark.posts.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </Link>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/posts/${bookmark.posts.slug}`}
                  className="flex-1 group"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-founder-primary transition-colors line-clamp-1">
                    {bookmark.posts.title}
                    {bookmark.posts.is_premium && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Premium
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {bookmark.posts.summary}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {bookmark.posts.author} · {bookmark.posts.category} · {' '}
                    {formatDistanceToNow(new Date(bookmark.created_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </p>
                </Link>
                
                {onRemove && (
                  <button
                    onClick={() => onRemove(bookmark.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="북마크 제거"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}