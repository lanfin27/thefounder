import Link from 'next/link'
import { Clock, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ReadingHistoryItem {
  id: string
  post_id: string
  posts: {
    id: string
    title: string
    slug: string
    category: string
    author: string
    cover?: string
  }
  progress: number
  total_reading_time: number
  completed: boolean
  last_read_at: string
}

interface ReadingHistoryProps {
  history: ReadingHistoryItem[]
}

export default function ReadingHistory({ history }: ReadingHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">아직 읽은 글이 없습니다.</p>
        <Link
          href="/posts"
          className="inline-flex items-center text-founder-primary hover:underline font-medium"
        >
          글 둘러보기 →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Link
          key={item.id}
          href={`/posts/${item.posts.slug}`}
          className="block group"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              {item.posts.cover && (
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={item.posts.cover}
                    alt={item.posts.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-founder-primary transition-colors line-clamp-2">
                      {item.posts.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.posts.author} · {item.posts.category}
                    </p>
                  </div>
                  
                  {item.completed && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{Math.ceil(item.total_reading_time / 60)}분 읽음</span>
                  </div>
                  
                  {!item.completed && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-founder-primary transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-gray-500">{Math.round(item.progress)}%</span>
                    </div>
                  )}
                  
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(item.last_read_at), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}